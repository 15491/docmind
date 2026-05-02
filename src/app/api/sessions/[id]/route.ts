import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { R, Err } from '@/lib/response'

// DELETE /api/sessions/[id] — 删除会话及其所有消息
export const DELETE = withAuth(async (_req, ctx, userId) => {
  try {
    const { id } = await ctx.params

    const chatSession = await prisma.chatSession.findUnique({
      where: { id },
      include: { knowledgeBase: { select: { userId: true } } },
    })

    if (!chatSession) return Err.notFound('会话不存在')
    if (chatSession.knowledgeBase.userId !== userId) return Err.forbidden('无权删除此会话')

    await prisma.chatSession.delete({ where: { id } })

    return R.ok({ id })
  } catch (error) {
    console.error('[DELETE /api/sessions/[id]] Error:', error)
    return Err.internal('删除会话失败')
  }
})
