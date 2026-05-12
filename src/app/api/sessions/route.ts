import { prisma } from '@/lib/infra/prisma'
import { getCreatedAtDescCursorOrderBy } from '@/lib/http/cursor-pagination'
import { listSessionsByKnowledgeBase } from '@/lib/route-core/session-route-core'
import { withAuth } from '@/lib/http/with-auth'

const sessionListDeps = {
  findKnowledgeBase: (kbId: string) => prisma.knowledgeBase.findUnique({
    where: { id: kbId },
    select: { userId: true },
  }),
  findSessions: (input: { kbId: string; cursor?: string; limit: number }) => prisma.chatSession.findMany({
    where: { knowledgeBaseId: input.kbId },
    include: { _count: { select: { messages: true } } },
    orderBy: getCreatedAtDescCursorOrderBy(),
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  }),
}

export const GET = withAuth(async (req, _ctx, userId) => {
  return listSessionsByKnowledgeBase(req.nextUrl.searchParams, userId, sessionListDeps)
})
