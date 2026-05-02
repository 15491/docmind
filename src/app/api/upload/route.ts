import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { documentQueue } from '@/lib/queue'
import type { DocumentJob } from '@/lib/queue'
import { rateLimit } from '@/lib/rate-limit'
import { uploadFile } from '@/lib/minio'
import { withAuth } from '@/lib/with-auth'
import { R, Err } from '@/lib/response'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
]

// POST /api/upload — 上传文件，加入异步处理队列
export const POST = withAuth(async (req, _ctx, userId) => {
  try {
    const { ok } = await rateLimit(`rl:upload:${userId}`, 10, 3600)
    if (!ok) return Err.tooMany('上传过于频繁，每小时最多 10 次')

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const kbId = formData.get('kbId') as string | null

    if (!file) return Err.invalid('未提供文件')
    if (!kbId) return Err.invalid('未指定知识库')
    if (file.size > MAX_FILE_SIZE) return Err.invalid('文件大小超过 50MB 限制')
    if (!ALLOWED_TYPES.includes(file.type)) return Err.invalid('不支持的文件类型')

    const kb = await prisma.knowledgeBase.findUnique({ where: { id: kbId } })
    if (!kb) return Err.notFound('知识库不存在')
    if (kb.userId !== userId) return Err.forbidden('无权上传到此知识库')

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const contentHash = createHash('md5').update(fileBuffer).digest('hex')

    const existingDoc = await prisma.document.findFirst({
      where: { knowledgeBaseId: kbId, contentHash },
    })

    if (existingDoc) {
      if (existingDoc.status === 'ready')     return Err.conflict(`文件已上传过，ID: ${existingDoc.id}`)
      if (existingDoc.status === 'failed')    return Err.conflict(`文件之前上传失败，请重试该文档：${existingDoc.id}`)
      if (existingDoc.status === 'uploading') return Err.conflict('文件正在上传中，请稍后')
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

    try {
      await uploadFile(objectKey, fileBuffer, file.type)
    } catch (err) {
      console.error('[/api/upload] Failed to upload file to MinIO:', err)
      throw err
    }

    await prisma.document.update({
      where: { id: document.id },
      data: { storageKey: objectKey },
    })

    const job = await documentQueue.add(
      'process-document',
      {
        documentId: document.id,
        knowledgeBaseId: kbId,
        userId,
        fileName: file.name,
        mimeType: file.type,
        objectKey,
      } satisfies DocumentJob,
      { jobId: `doc-${document.id}` }
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
