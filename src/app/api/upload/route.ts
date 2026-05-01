import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { documentQueue } from '@/lib/queue'
import type { DocumentJob } from '@/lib/queue'
import { rateLimit } from '@/lib/rate-limit'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
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
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { ok } = await rateLimit(`rl:upload:${session.user.id}`, 10, 3600)
    if (!ok) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: '上传过于频繁，每小时最多 10 次' },
        { status: 429 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const kbId = formData.get('kbId') as string | null

    // 验证参数
    if (!file) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '未提供文件' },
        { status: 422 }
      )
    }

    if (!kbId) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '未指定知识库' },
        { status: 422 }
      )
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'FILE_TOO_LARGE', message: '文件大小超过 10MB 限制' },
        { status: 413 }
      )
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'INVALID_FILE_TYPE', message: '不支持的文件类型' },
        { status: 422 }
      )
    }

    // 验证知识库归属权
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id: kbId },
    })

    if (!kb) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '知识库不存在' },
        { status: 404 }
      )
    }

    if (kb.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '无权上传到此知识库' },
        { status: 403 }
      )
    }

    // 创建 Document 记录，状态为 processing
    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'processing',
        knowledgeBaseId: kbId,
      },
    })

    // 写入临时文件，避免将大文件存入 Redis
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const tempPath = join(tmpdir(), `docmind-${document.id}`)
    await writeFile(tempPath, fileBuffer)

    // 加入 BullMQ 队列（job 里只存路径）
    const job = await documentQueue.add(
      'process-document',
      {
        documentId: document.id,
        knowledgeBaseId: kbId,
        userId: session.user.id,
        fileName: file.name,
        mimeType: file.type,
        filePath: tempPath,
      },
      {
        jobId: `doc-${document.id}`,
      }
    )

    console.log(
      `[/api/upload] Document ${document.id} added to queue (job ${job.id})`
    )

    return NextResponse.json({
      document: {
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        status: document.status,
        createdAt: document.createdAt,
      },
    }, { status: 202 })
  } catch (error) {
    console.error('[/api/upload] Error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '文件上传失败' },
      { status: 500 }
    )
  }
}
