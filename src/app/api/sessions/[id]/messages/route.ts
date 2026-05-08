import { prisma } from '@/lib/prisma'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/validate-request'
import { idParamSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (_req, ctx, userId) => {
  try {
    const params = await validateRouteParams(ctx.params, idParamSchema)
    if (isValidationErrorResponse(params)) return params

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: params.id },
      include: { knowledgeBase: true },
    })

    if (!chatSession) return Err.notFound('会话不存在')
    if (chatSession.knowledgeBase.userId !== userId) return Err.forbidden('无权访问此会话')

    const messages = await prisma.message.findMany({
      where: { sessionId: params.id },
      orderBy: { createdAt: 'asc' },
    })

    return R.ok({
      session: {
        id: chatSession.id,
        title: chatSession.title || '新对话',
        createdAt: chatSession.createdAt,
      },
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        sources: message.sources || [],
        analysis: message.analysis || null,
        createdAt: message.createdAt,
      })),
    })
  } catch (error) {
    console.error('[/api/sessions/[id]/messages] Error:', error)
    return Err.internal('获取消息失败')
  }
})
