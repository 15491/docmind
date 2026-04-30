import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/sessions/[id]/messages — 查询会话的所有消息
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

    const { id: sessionId } = await params

    // 获取会话，验证归属权
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        knowledgeBase: true,
      },
    })

    if (!chatSession) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '会话不存在' },
        { status: 404 }
      )
    }

    if (chatSession.knowledgeBase.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '无权访问此会话' },
        { status: 403 }
      )
    }

    // 获取会话中的所有消息
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      session: {
        id: chatSession.id,
        title: chatSession.title || '新对话',
        createdAt: chatSession.createdAt,
      },
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sources: msg.sources || [],
        createdAt: msg.createdAt,
      })),
    })
  } catch (error) {
    console.error('[/api/sessions/[id]/messages] Error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '获取消息失败' },
      { status: 500 }
    )
  }
}
