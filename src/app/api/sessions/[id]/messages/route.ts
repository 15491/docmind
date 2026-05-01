import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { R, Err } from '@/lib/response'

// GET /api/sessions/[id]/messages — 查询会话的所有消息
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Err.unauthorized()
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
      return Err.notFound('会话不存在')
    }

    if (chatSession.knowledgeBase.userId !== session.user.id) {
      return Err.forbidden('无权访问此会话')
    }

    // 获取会话中的所有消息
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })

    return R.ok({
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
    return Err.internal('获取消息失败')
  }
}
