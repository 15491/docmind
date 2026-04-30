import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/kb/[id] — 获取知识库详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id } = await params

    const kb = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        _count: {
          select: { documents: true },
        },
      },
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

    return NextResponse.json({
      kb: {
        id: kb.id,
        name: kb.name,
        documentCount: kb._count.documents,
        createdAt: kb.createdAt,
      },
    })
  } catch (error) {
    console.error('[/api/kb GET] Error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '获取知识库失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/kb/[id] — 删除知识库（级联删除文档和chunks）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id } = await params

    // 验证知识库归属权
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id },
    })

    if (!kb) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '知识库不存在' },
        { status: 404 }
      )
    }

    if (kb.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '无权删除此知识库' },
        { status: 403 }
      )
    }

    // 级联删除：知识库 → 文档 → chunks
    // Prisma 会自动处理由于 @relation onDelete 约束
    await prisma.knowledgeBase.delete({
      where: { id },
    })

    return NextResponse.json({
      message: '知识库已删除',
    })
  } catch (error) {
    console.error('[/api/kb DELETE] Error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '删除知识库失败' },
      { status: 500 }
    )
  }
}
