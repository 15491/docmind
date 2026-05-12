import { prisma } from '@/lib/infra/prisma'
import { deleteSessionById } from '@/lib/route-core/session-route-core'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/http/validate-request'
import { idParamSchema } from '@/lib/http/validators'
import { withAuth } from '@/lib/http/with-auth'

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
