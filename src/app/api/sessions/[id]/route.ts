import { prisma } from '@/lib/prisma'
import { deleteSessionById } from '@/lib/session-route-core'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/validate-request'
import { idParamSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

const sessionDeleteDeps = {
  findSession: (sessionId: string) => prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { knowledgeBase: { select: { userId: true } } },
  }),
  deleteSession: (sessionId: string) => prisma.chatSession.delete({ where: { id: sessionId } }),
}

export const DELETE = withAuth(async (_req, ctx, userId) => {
  const params = await validateRouteParams(ctx.params, idParamSchema)
  if (isValidationErrorResponse(params)) return params

  return deleteSessionById(params.id, userId, sessionDeleteDeps)
})
