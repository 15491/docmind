import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { embedText, searchVectors } from '@/lib/rag/embeddings'
import { generateAnswer, streamWithToolDetection, parseStreamContent, type HistoryMessage } from '@/lib/rag/generation'
import { summarizeMessages } from '@/lib/rag/summarize'
import { webSearch, type WebResult } from '@/lib/web-search'
import { rateLimit } from '@/lib/rate-limit'
import { getUserContext } from '@/lib/get-api-key'
import { Err } from '@/lib/response'

interface ChatRequest {
  question: string
  kbId: string
  sessionId?: string
}

// POST /api/chat — SSE 流式问答
export const POST = withAuth(async (req, _ctx, userId) => {
  try {
    const { ok } = await rateLimit(`rl:chat:${userId}`, 20, 60)
    if (!ok) return Err.tooMany('操作过于频繁，请稍后再试')

    const body = await req.json() as ChatRequest
    const { question, kbId, sessionId } = body

    if (!question?.trim()) return Err.invalid('问题不能为空')
    if (!kbId)             return Err.invalid('缺少知识库ID')

    const kb = await prisma.knowledgeBase.findUnique({ where: { id: kbId } })
    if (!kb)                 return Err.notFound('知识库不存在')
    if (kb.userId !== userId) return Err.forbidden('无权访问此知识库')

    const { apiKey: userApiKey, ragConfig } = await getUserContext(userId)

    let session_record = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null

    if (session_record && session_record.knowledgeBaseId !== kbId) {
      return Err.forbidden('会话不属于此知识库')
    }

    if (!session_record) {
      session_record = await prisma.chatSession.create({
        data: { title: question.slice(0, 50), knowledgeBaseId: kbId },
      })
    }

    const recentMessages = await prisma.message.findMany({
      where: { sessionId: session_record.id, role: { in: ['user', 'assistant'] } },
      orderBy: { createdAt: 'asc' },
      take: -8,
      select: { role: true, content: true },
    })
    const history: HistoryMessage[] = recentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    if (session_record.summary) {
      history.unshift({ role: 'assistant', content: '好的，我已了解之前的对话内容，请继续。' })
      history.unshift({ role: 'user', content: `[对话历史摘要]\n${session_record.summary}` })
    }

    await prisma.message.create({
      data: { role: 'user', content: question, sessionId: session_record.id },
    })

    let questionEmbedding: number[]
    try {
      questionEmbedding = await embedText(question, userApiKey)
    } catch (error) {
      console.error('[/api/chat] Embedding error:', error)
      return Err.internal('问题处理失败')
    }

    let searchResults
    try {
      searchResults = await searchVectors({ embedding: questionEmbedding, kbId, topK: ragConfig.topK })
    } catch (error) {
      console.error('[/api/chat] Search error:', error)
      return Err.internal('检索失败')
    }

    const systemPrompt = '你是一个专业的文档问答助手。如果知识库文档中已有足够信息，请直接基于文档回答；如果问题涉及实时数据、最新事件或文档中没有的内容，请调用 web_search 工具获取最新信息。'

    const buildPrompt = (extraWebResults: WebResult[] = []) => {
      const docChunks = searchResults
        .map((r, i) => `[文档${i + 1}] ${r.fileName}\n${r.content}`)
        .join('\n\n')
      const webChunks = extraWebResults
        .map((r, i) => `[网络${i + 1}] ${r.title}（${r.url}）\n${r.content}`)
        .join('\n\n')
      const contextParts = [
        docChunks && `【知识库文档】\n${docChunks}`,
        webChunks && `【联网搜索结果】\n${webChunks}`,
      ].filter(Boolean).join('\n\n')
      return `基于以下内容回答问题。如果答案来自文档，请引用文档名称；如果来自网络搜索，请注明来源网址。\n\n${contextParts}\n\n【用户问题】\n${question}`
    }

    const sessionId_final = session_record.id

    return new NextResponse(
      new ReadableStream({
        async start(controller) {
          const enc = new TextEncoder()
          const send = (event: string, data: unknown) =>
            controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))

          try {
            let fullContent = ''
            let webResults: WebResult[] = []
            let toolCallDetected = false

            const gen = streamWithToolDetection({
              prompt: buildPrompt(),
              systemPrompt,
              history,
              apiKey: userApiKey,
              temperature: ragConfig.temperature,
            })

            for await (const event of gen) {
              if (event.type === 'content') {
                fullContent += event.chunk
                send('chunk', { content: event.chunk })
              } else {
                toolCallDetected = true
                send('tool_call', { query: event.query })

                try {
                  webResults = await webSearch(event.query)
                } catch (err) {
                  console.error('[/api/chat] Web search error:', err)
                }

                const toolResultPayload = {
                  id: event.id,
                  content: webResults.length > 0
                    ? webResults.map((r, i) => `[${i + 1}] ${r.title}（${r.url}）\n${r.content}`).join('\n\n')
                    : '未找到相关网络结果',
                }

                const glmResponse = await generateAnswer({
                  prompt: buildPrompt(webResults),
                  systemPrompt,
                  history,
                  toolResult: toolResultPayload,
                  apiKey: userApiKey,
                  temperature: ragConfig.temperature,
                })

                for await (const chunk of parseStreamContent(glmResponse)) {
                  fullContent += chunk
                  send('chunk', { content: chunk })
                }
              }
            }

            if (!fullContent && searchResults.length === 0 && webResults.length === 0) {
              const tip = toolCallDetected
                ? '联网搜索未找到相关内容，请尝试换个问法。'
                : '未在知识库中找到相关内容，请尝试换个问法。'
              fullContent = tip
              send('chunk', { content: tip })
            }

            const sources = [
              ...searchResults.map((r) => ({
                fileName: r.fileName,
                chunkIndex: r.chunkIndex,
                content: r.content.slice(0, 200),
              })),
              ...webResults.map((r) => ({
                fileName: r.title,
                chunkIndex: 0,
                content: r.content.slice(0, 200),
                url: r.url,
              })),
            ]
            send('sources', { sources })

            await prisma.message.create({
              data: { role: 'assistant', content: fullContent, sources, sessionId: sessionId_final },
            })

            send('done', { sessionId: sessionId_final })
            controller.close()

            prisma.message.count({
              where: { sessionId: sessionId_final, role: { in: ['user', 'assistant'] } },
            }).then(async (totalCount) => {
              if (totalCount <= 20) return

              const allMessages = await prisma.message.findMany({
                where: { sessionId: sessionId_final, role: { in: ['user', 'assistant'] } },
                orderBy: { createdAt: 'asc' },
                select: { id: true, role: true, content: true },
              })
              const toSummarize = allMessages.slice(0, allMessages.length - 8)
              if (toSummarize.length === 0) return

              try {
                const summary = await summarizeMessages(toSummarize, userApiKey)
                await prisma.$transaction([
                  prisma.chatSession.update({ where: { id: sessionId_final }, data: { summary } }),
                  prisma.message.deleteMany({ where: { id: { in: toSummarize.map((m) => m.id) } } }),
                ])
              } catch (err) {
                console.error('[/api/chat] Summarize failed:', err)
              }
            }).catch((err) => console.error('[/api/chat] Count failed:', err))

          } catch (error) {
            console.error('[/api/chat] Stream error:', error)
            try {
              send('error', { message: '生成失败，请重试' })
              send('done', { sessionId: sessionId_final })
              controller.close()
            } catch {
              controller.error(error)
            }
          }
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    )
  } catch (error) {
    console.error('[/api/chat] Error:', error)
    return Err.internal('处理失败')
  }
})
