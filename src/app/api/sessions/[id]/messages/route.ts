import { prisma } from '@/lib/infra/prisma'
import { getSessionMessagesById } from '@/lib/route-core/session-route-core'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/http/validate-request'
import { idParamSchema } from '@/lib/http/validators'
import { withAuth } from '@/lib/http/with-auth'

const sessionMessagesDeps = {
  findSession: (sessionId: string) => prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { knowledgeBase: { select: { userId: true } } },
  }),
  findMessages: (sessionId: string) => prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  }),
}

export const GET = withAuth(async (_req, ctx, userId) => {
  const params = await validateRouteParams(ctx.params, idParamSchema)
  if (isValidationErrorResponse(params)) return params

  return getSessionMessagesById(params.id, userId, sessionMessagesDeps)
})
