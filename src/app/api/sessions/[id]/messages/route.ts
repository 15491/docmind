import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { R, Err } from '@/lib/response'

// GET /api/sessions/[id]/messages — 查询会话的所有消息
export const GET = withAuth(async (_req, ctx, userId) => {
  try {
    const { id: sessionId } = await ctx.params

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { knowledgeBase: true },
    })

    if (!chatSession) return Err.notFound('会话不存在')
    if (chatSession.knowledgeBase.userId !== userId) return Err.forbidden('无权访问此会话')

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
})
