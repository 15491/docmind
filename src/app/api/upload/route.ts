import { createHash } from 'crypto'
import { uploadFile } from '@/lib/minio'
import { prisma } from '@/lib/prisma'
import { enqueueDocumentJob, type DocumentJob } from '@/lib/queue'
import { rateLimit } from '@/lib/rate-limit'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, validateFile, validateRequest } from '@/lib/validate-request'
import { uploadFileSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
]

export const POST = withAuth(async (req, _ctx, userId) => {
  try {
    const { ok } = await rateLimit(`rl:upload:${userId}`, 10, 3600)
    if (!ok) return Err.tooMany('上传过于频繁，每小时最多 10 次')

    const formData = await req.formData()
    const rawFile = formData.get('file')
    const file = rawFile instanceof File ? rawFile : null
    const body = validateRequest({ kbId: formData.get('kbId') }, uploadFileSchema)
    if (isValidationErrorResponse(body)) return body

    const fileError = validateFile(file, { maxSize: MAX_FILE_SIZE, allowedTypes: ALLOWED_TYPES })
    if (fileError) return Err.invalid(fileError)

    if (!file) return Err.invalid('未提供文件')

    const { kbId } = body
    const kb = await prisma.knowledgeBase.findUnique({ where: { id: kbId } })
    if (!kb) return Err.notFound('知识库不存在')
    if (kb.userId !== userId) return Err.forbidden('无权上传到此知识库')

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const contentHash = createHash('md5').update(fileBuffer).digest('hex')
    const existingDoc = await prisma.document.findFirst({
      where: { knowledgeBaseId: kbId, contentHash },
    })

    if (existingDoc) {
      if (existingDoc.status === 'ready') return Err.conflict(`文件已上传过，ID: ${existingDoc.id}`)
      if (existingDoc.status === 'failed') return Err.conflict(`文件之前上传失败，请重试该文档：${existingDoc.id}`)
      if (existingDoc.status === 'processing') return Err.conflict('文件正在处理中，请稍后')
    }

    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'processing',
        contentHash,
        knowledgeBaseId: kbId,
      },
    })

    const objectKey = `documents/${document.id}/${file.name}`
    await uploadFile(objectKey, fileBuffer, file.type)

    await prisma.document.update({
      where: { id: document.id },
      data: { storageKey: objectKey },
    })

    const job = await enqueueDocumentJob(
      {
        documentId: document.id,
        knowledgeBaseId: kbId,
        userId,
        fileName: file.name,
        mimeType: file.type,
        objectKey,
      } satisfies DocumentJob
    )

    console.log(`[/api/upload] Document ${document.id} added to queue (job ${job.id})`)
    return R.ok({
      document: {
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        status: document.status,
        createdAt: document.createdAt,
      },
    }, 202)
  } catch (error) {
    console.error('[/api/upload] Error:', error)
    return Err.internal('文件上传失败')
  }
})
