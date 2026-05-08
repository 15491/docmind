import { prisma } from '@/lib/prisma'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/validate-request'
import { idParamSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const DELETE = withAuth(async (_req, ctx, userId) => {
  try {
    const params = await validateRouteParams(ctx.params, idParamSchema)
    if (isValidationErrorResponse(params)) return params

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: params.id },
      include: { knowledgeBase: { select: { userId: true } } },
    })

    if (!chatSession) return Err.notFound('会话不存在')
    if (chatSession.knowledgeBase.userId !== userId) return Err.forbidden('无权删除此会话')

    await prisma.chatSession.delete({ where: { id: params.id } })
    return R.ok({ id: params.id })
  } catch (error) {
    console.error('[DELETE /api/sessions/[id]] Error:', error)
    return Err.internal('删除会话失败')
  }
})
