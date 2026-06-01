import { NextResponse } from 'next/server'
import { prisma } from '@/lib/infra/prisma'
import { withAuth } from '@/lib/http/with-auth'
import { rateLimit } from '@/lib/http/rate-limit'
import { getUserContext } from '@/lib/api-key/get-api-key'
import { Err } from '@/lib/http/response'
import { chatSchema } from '@/lib/http/validators'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/http/validate-request'
import { runChatPipeline } from '@/lib/route-core/chat-pipeline'

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}

export const POST = withAuth(async (req, _ctx, userId) => {
  const { ok } = await rateLimit(`rl:chat:${userId}`, 20, 60)
  if (!ok) return Err.tooMany('操作过于频繁，请稍后再试')

  const body = await parseJsonBody(req, chatSchema)
  if (isValidationErrorResponse(body)) return body

  const { question, kbId, sessionId } = body

  const kb = await prisma.knowledgeBase.findUnique({ where: { id: kbId } })
  if (!kb) return Err.notFound('知识库不存在')
  if (kb.userId !== userId) return Err.forbidden('无权访问此知识库')

  if (sessionId) {
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
    if (session && session.knowledgeBaseId !== kbId) return Err.forbidden('会话不属于此知识库')
  }

  const { apiKey, ragConfig } = await getUserContext(userId)

  return new NextResponse(
    new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        let closed = false

        const send = (event: string, data: unknown) => {
          if (closed) return
          try {
            controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          } catch {
            closed = true
          }
        }

        const close = () => {
          if (closed) return
          closed = true
          try { controller.close() } catch { /* no-op */ }
        }

        let lastSessionId = sessionId ?? ''
        let lastIntent = 'document'
        let lastRouteMode = 'kb_only'

        try {
          for await (const event of runChatPipeline({ question, kbId, sessionId, apiKey, ragConfig })) {
            if (event.type === 'done') {
              lastSessionId = event.sessionId
              lastIntent = event.intent
              lastRouteMode = event.routeMode
            }
            send(event.type, event)
          }
        } catch (err) {
          console.error('[/api/chat] Stream error:', err)
          send('error', { message: '生成失败，请重试' })
          send('done', { sessionId: lastSessionId, intent: lastIntent, routeMode: lastRouteMode })
        }

        close()
      },
    }),
    { status: 200, headers: SSE_HEADERS }
  )
})
