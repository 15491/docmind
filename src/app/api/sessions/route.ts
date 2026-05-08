import { prisma } from '@/lib/prisma'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, validateSearchParams } from '@/lib/validate-request'
import { sessionsQuerySchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, _ctx, userId) => {
  try {
    const query = validateSearchParams(req.nextUrl.searchParams, sessionsQuerySchema)
    if (isValidationErrorResponse(query)) return query

    const { kbId, cursor, limit } = query
    const kb = await prisma.knowledgeBase.findUnique({ where: { id: kbId } })
    if (!kb) return Err.notFound('知识库不存在')
    if (kb.userId !== userId) return Err.forbidden('无权访问此知识库')

    const sessions = await prisma.chatSession.findMany({
      where: { knowledgeBaseId: kbId },
      include: { _count: { select: { messages: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = sessions.length > limit
    const page = hasMore ? sessions.slice(0, limit) : sessions
    const nextCursor = hasMore ? page[page.length - 1].id : null

    return R.ok({
      sessions: page.map((session) => ({
        id: session.id,
        title: session.title || '新对话',
        messageCount: session._count.messages,
        createdAt: session.createdAt,
      })),
      nextCursor,
    })
  } catch (error) {
    console.error('[/api/sessions] Error:', error)
    return Err.internal('获取会话列表失败')
  }
})
