import { Err, R } from '@/lib/http/response'
import { isValidationErrorResponse, validateSearchParams } from '@/lib/http/validate-request'
import { sessionsQuerySchema } from '@/lib/http/validators'

type KnowledgeBaseRecord = {
  userId: string
}

type SessionListRecord = {
  id: string
  title: string | null
  createdAt: Date
  _count: {
    messages: number
  }
}

type SessionRecord = {
  id: string
  title: string | null
  createdAt: Date
  knowledgeBase: {
    userId: string
  }
}

type MessageRecord = {
  id: string
  role: string
  content: string
  sources: unknown
  analysis: unknown
  createdAt: Date
}

export interface SessionRouteDeps {
  findKnowledgeBase: (kbId: string) => Promise<KnowledgeBaseRecord | null>
  findSessions: (input: {
    kbId: string
    cursor?: string
    limit: number
  }) => Promise<SessionListRecord[]>
  findSession: (sessionId: string) => Promise<SessionRecord | null>
  findMessages: (sessionId: string) => Promise<MessageRecord[]>
  deleteSession: (sessionId: string) => Promise<unknown>
}

function getSessionTitle(title: string | null | undefined) {
  return title || '新对话'
}

export async function listSessionsByKnowledgeBase(
  searchParams: URLSearchParams,
  userId: string,
  deps: Pick<SessionRouteDeps, 'findKnowledgeBase' | 'findSessions'>
): Promise<Response> {
  try {
    const query = validateSearchParams(searchParams, sessionsQuerySchema)
    if (isValidationErrorResponse(query)) return query

    const { kbId, cursor, limit } = query
    const kb = await deps.findKnowledgeBase(kbId)
    if (!kb) return Err.notFound('知识库不存在')
    if (kb.userId !== userId) return Err.forbidden('无权访问此知识库')

    const sessions = await deps.findSessions({ kbId, cursor, limit })
    const hasMore = sessions.length > limit
    const page = hasMore ? sessions.slice(0, limit) : sessions
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null

    return R.ok({
      sessions: page.map((session) => ({
        id: session.id,
        title: getSessionTitle(session.title),
        messageCount: session._count.messages,
        createdAt: session.createdAt,
      })),
      nextCursor,
    })
  } catch (error) {
    console.error('[/api/sessions] Error:', error)
    return Err.internal('获取会话列表失败')
  }
}

export async function deleteSessionById(
  sessionId: string,
  userId: string,
  deps: Pick<SessionRouteDeps, 'findSession' | 'deleteSession'>
): Promise<Response> {
  try {
    const chatSession = await deps.findSession(sessionId)

    if (!chatSession) return Err.notFound('会话不存在')
    if (chatSession.knowledgeBase.userId !== userId) return Err.forbidden('无权删除此会话')

    await deps.deleteSession(sessionId)
    return R.ok({ id: sessionId })
  } catch (error) {
    console.error('[DELETE /api/sessions/[id]] Error:', error)
    return Err.internal('删除会话失败')
  }
}

export async function getSessionMessagesById(
  sessionId: string,
  userId: string,
  deps: Pick<SessionRouteDeps, 'findSession' | 'findMessages'>
): Promise<Response> {
  try {
    const chatSession = await deps.findSession(sessionId)

    if (!chatSession) return Err.notFound('会话不存在')
    if (chatSession.knowledgeBase.userId !== userId) return Err.forbidden('无权访问此会话')

    const messages = await deps.findMessages(sessionId)

    return R.ok({
      session: {
        id: chatSession.id,
        title: getSessionTitle(chatSession.title),
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
}
