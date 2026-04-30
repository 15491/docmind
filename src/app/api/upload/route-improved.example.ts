import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { documentQueue } from '@/lib/queue'
import { validateFile } from '@/lib/validate-request'
import type { DocumentJob } from '@/lib/queue'

const ALLOWED_FILE_TYPES = [
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

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const kbId = formData.get('kbId') as string | null

    // 使用统一的文件验证函数
    const fileError = validateFile(file, {
      maxSize: 10 * 1024 * 1024,
      allowedTypes: ALLOWED_FILE_TYPES,
    })

    if (fileError) {
      return NextResponse.json(
        { error: 'INVALID_FILE', message: fileError },
        { status: 422 }
      )
    }

    // 验证 kbId
    if (!kbId?.trim()) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '未指定知识库' },
        { status: 422 }
      )
    }

    // 验证知识库归属权（单次查询）
    const kb = await prisma.knowledgeBase.findUniqueOrThrow({
      where: { id: kbId },
    }).catch(() => null)

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

    // 创建 Document 记录
    const document = await prisma.document.create({
      data: {
        fileName: file!.name,
        fileSize: file!.size,
        mimeType: file!.type,
        status: 'processing',
        knowledgeBaseId: kbId,
      },
    })

    // 将文件转换为 Buffer 并 base64 编码
    const buffer = await file!.arrayBuffer()
    const base64Buffer = Buffer.from(buffer).toString('base64')

    // 加入 BullMQ 队列
    await documentQueue.add<DocumentJob>(
      'process-document',
      {
        documentId: document.id,
        knowledgeBaseId: kbId,
        fileName: file!.name,
        mimeType: file!.type,
        buffer: base64Buffer,
      },
      {
        jobId: `doc-${document.id}`,
      }
    )

    return NextResponse.json(
      {
        document: {
          id: document.id,
          fileName: document.fileName,
          fileSize: document.fileSize,
          status: document.status,
          createdAt: document.createdAt,
        },
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('[/api/upload] Error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '文件上传失败' },
      { status: 500 }
    )
  }
}
