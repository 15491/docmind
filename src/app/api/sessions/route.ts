import { prisma } from '@/lib/prisma'
import { listSessionsByKnowledgeBase } from '@/lib/session-route-core'
import { withAuth } from '@/lib/with-auth'

const sessionListDeps = {
  findKnowledgeBase: (kbId: string) => prisma.knowledgeBase.findUnique({
    where: { id: kbId },
    select: { userId: true },
  }),
  findSessions: (input: { kbId: string; cursor?: string; limit: number }) => prisma.chatSession.findMany({
    where: { knowledgeBaseId: input.kbId },
    include: { _count: { select: { messages: true } } },
    orderBy: { createdAt: 'desc' },
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  }),
}

export const GET = withAuth(async (req, _ctx, userId) => {
  return listSessionsByKnowledgeBase(req.nextUrl.searchParams, userId, sessionListDeps)
})
