import { prisma } from '@/lib/prisma'
import { getSessionMessagesById } from '@/lib/session-route-core'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/validate-request'
import { idParamSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

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
