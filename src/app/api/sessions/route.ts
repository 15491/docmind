import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/sessions?kbId=xxx — 查询知识库的所有会话
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

    // 获取会话列表
    const sessions = await prisma.chatSession.findMany({
      where: { knowledgeBaseId: kbId },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title || '新对话',
        messageCount: s._count.messages,
        createdAt: s.createdAt,
      })),
    })
  } catch (error) {
    console.error('[/api/sessions] Error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '获取会话列表失败' },
      { status: 500 }
    )
  }
}
