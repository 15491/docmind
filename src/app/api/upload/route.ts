import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { documentQueue } from '@/lib/queue'
import type { DocumentJob } from '@/lib/queue'
import { rateLimit } from '@/lib/rate-limit'
import { uploadFile } from '@/lib/minio'
import { R, Err } from '@/lib/response'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
]

// POST /api/upload — 上传文件，加入异步处理队列
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Err.unauthorized()
    }

    const { ok } = await rateLimit(`rl:upload:${session.user.id}`, 10, 3600)
    if (!ok) {
      return Err.tooMany('上传过于频繁，每小时最多 10 次')
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const kbId = formData.get('kbId') as string | null

    // 验证参数
    if (!file) {
      return Err.invalid('未提供文件')
    }

    if (!kbId) {
      return Err.invalid('未指定知识库')
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return Err.invalid('文件大小超过 50MB 限制')
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Err.invalid('不支持的文件类型')
    }

    // 验证知识库归属权
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id: kbId },
    })

    if (!kb) {
      return Err.notFound('知识库不存在')
    }

    if (kb.userId !== session.user.id) {
      return Err.forbidden('无权上传到此知识库')
    }

    // 计算文件内容哈希
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const contentHash = createHash('md5').update(fileBuffer).digest('hex')

    // 检查是否存在相同哈希的文档
    const existingDoc = await prisma.document.findFirst({
      where: {
        knowledgeBaseId: kbId,
        contentHash: contentHash,
      },
    })

    if (existingDoc) {
      if (existingDoc.status === 'ready') {
        return Err.conflict(`文件已上传过，ID: ${existingDoc.id}`)
      } else if (existingDoc.status === 'failed') {
        return Err.conflict(`文件之前上传失败，请重试该文档：${existingDoc.id}`)
      } else if (existingDoc.status === 'uploading') {
        return Err.conflict('文件正在上传中，请稍后')
      }
    }

    // 创建 Document 记录，状态为 processing
    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'processing',
        contentHash: contentHash,
        knowledgeBaseId: kbId,
      },
    })

    // 上传文件到 MinIO
    const objectKey = `documents/${document.id}/${file.name}`

    try {
      await uploadFile(objectKey, fileBuffer, file.type)
      console.log(`[/api/upload] File uploaded to MinIO: ${objectKey}`)
    } catch (err) {
      console.error('[/api/upload] Failed to upload file to MinIO:', err)
      throw err
    }

    // 更新 Document 记录记录 storageKey
    await prisma.document.update({
      where: { id: document.id },
      data: { storageKey: objectKey },
    })

    // 加入 BullMQ 队列（job 里存 MinIO 对象键）
    const job = await documentQueue.add(
      'process-document',
      {
        documentId: document.id,
        knowledgeBaseId: kbId,
        userId: session.user.id,
        fileName: file.name,
        mimeType: file.type,
        objectKey: objectKey,
      },
      {
        jobId: `doc-${document.id}`,
      }
    )

    console.log(
      `[/api/upload] Document ${document.id} added to queue (job ${job.id})`
    )

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
}
