import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/documents/status?kbId=xxx — 查询知识库中的所有文档及其处理状态
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const kbId = req.nextUrl.searchParams.get('kbId')
    if (!kbId) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '缺少 kbId 参数' },
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
        { error: 'FORBIDDEN', message: '无权访问此知识库' },
        { status: 403 }
      )
    }

    const cursor = req.nextUrl.searchParams.get('cursor') ?? undefined
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 20), 100)

    const documents = await prisma.document.findMany({
      where: { knowledgeBaseId: kbId },
      include: { _count: { select: { chunks: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = documents.length > limit
    const page = hasMore ? documents.slice(0, limit) : documents
    const nextCursor = hasMore ? page[page.length - 1].id : null

    return NextResponse.json({
      documents: page.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        status: doc.status,
        chunkCount: doc._count.chunks,
        createdAt: doc.createdAt,
      })),
      nextCursor,
    })
  } catch (error) {
    console.error('[/api/documents/status] Error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '查询文档状态失败' },
      { status: 500 }
    )
  }
}
