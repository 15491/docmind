import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { streamWithToolDetection, type HistoryMessage } from '@/lib/rag/generation'
import { summarizeMessages } from '@/lib/rag/summarize'
import { webSearch, type WebResult } from '@/lib/web-search'
import { rateLimit } from '@/lib/rate-limit'
import { getUserContext } from '@/lib/get-api-key'
import { Err } from '@/lib/response'
import { chatSchema } from '@/lib/validators'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/validate-request'
import { formatContext, streamDocumentAnswer } from '@/lib/langchain/chains/document-qa'
import { extractAnswerMetadata } from '@/lib/langchain/chains/structured-answer'
import { KnowledgeBaseRetriever } from '@/lib/langchain/retrievers/kb-retriever'
import {
  buildChatHistory,
  CHAT_SYSTEM_PROMPT,
  classifyChatIntent,
  DOC_SYSTEM_PROMPT,
  filterQualifiedChunks,
  heuristicChatRoute,
  mapChatSources,
  type RetrievedChunk,
} from '@/lib/chat-route-core'

export const POST = withAuth(async (req, _ctx, userId) => {
  try {
    const { ok } = await rateLimit(`rl:chat:${userId}`, 20, 60)
    if (!ok) return Err.tooMany('操作过于频繁，请稍后再试')

    const body = await parseJsonBody(req, chatSchema)
    if (isValidationErrorResponse(body)) return body

    const { question, kbId, sessionId } = body

    const kb = await prisma.knowledgeBase.findUnique({ where: { id: kbId } })
    if (!kb) return Err.notFound('知识库不存在')
    if (kb.userId !== userId) return Err.forbidden('无权访问此知识库')

    const { apiKey: userApiKey, ragConfig } = await getUserContext(userId)

    let sessionRecord = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null

    if (sessionRecord && sessionRecord.knowledgeBaseId !== kbId) {
      return Err.forbidden('会话不属于此知识库')
    }

    if (!sessionRecord) {
      sessionRecord = await prisma.chatSession.create({
        data: { title: question.slice(0, 50), knowledgeBaseId: kbId },
      })
    }

    const recentMessages = (await prisma.message.findMany({
      where: { sessionId: sessionRecord.id, role: { in: ['user', 'assistant'] } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { role: true, content: true },
    })).reverse()

    const historyMessages: HistoryMessage[] = recentMessages.map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    }))
    const history = buildChatHistory(historyMessages, sessionRecord.summary)

    await prisma.message.create({
      data: { role: 'user', content: question, sessionId: sessionRecord.id },
    })

    const intent = classifyChatIntent(question)
    const sessionIdFinal = sessionRecord.id

    let searchResults: RetrievedChunk[] = []
    if (intent === 'document') {
      try {
        const retriever = new KnowledgeBaseRetriever({
          kbId,
          apiKey: userApiKey,
          topK: ragConfig.topK,
        })
        const documents = await retriever.invoke(question)
        searchResults = documents.map((doc) => ({
          id: doc.id ?? '',
          content: doc.pageContent,
          fileName: doc.metadata.fileName,
          chunkIndex: doc.metadata.chunkIndex,
          similarity: doc.metadata.similarity,
        }))
      } catch (error) {
        console.error('[/api/chat] Retrieval error:', error)
        return Err.internal('检索失败')
      }
    }

    const qualifiedResults = filterQualifiedChunks(searchResults)
    const routeMode = intent === 'document'
      ? heuristicChatRoute(question, qualifiedResults.length > 0)
      : 'kb_only'

    const willGenerateAnalysis = intent === 'document' && qualifiedResults.length > 0
    const systemPrompt = intent === 'conversational' ? CHAT_SYSTEM_PROMPT : DOC_SYSTEM_PROMPT

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
            try {
              controller.close()
            } catch {
              // no-op
            }
          }

          try {
            let fullContent = ''
            let webResults: WebResult[] = []
            let toolCallDetected = false
            let finalContext = ''

            if (intent === 'document') {
              const kbContext = formatContext(
                qualifiedResults.map((result) => ({
                  fileName: result.fileName,
                  chunkIndex: result.chunkIndex,
                  content: result.content.slice(0, 800),
                }))
              )

              finalContext = kbContext

              if (routeMode === 'kb_web') {
                const generator = streamWithToolDetection({
                  prompt: question,
                  systemPrompt,
                  history,
                  apiKey: userApiKey,
                  temperature: ragConfig.temperature,
                })

                let toolQuery = ''
                for await (const event of generator) {
                  if (event.type === 'tool_call') {
                    toolCallDetected = true
                    toolQuery = event.query
                    send('tool_call', { query: event.query })
                  }
                }

                if (toolCallDetected && toolQuery) {
                  try {
                    webResults = await webSearch(toolQuery)
                  } catch (error) {
                    console.error('[/api/chat] Web search error:', error)
                  }
                }

                finalContext = formatContext(
                  qualifiedResults.map((result) => ({
                    fileName: result.fileName,
                    chunkIndex: result.chunkIndex,
                    content: result.content.slice(0, 800),
                  })),
                  webResults.map((result) => ({
                    fileName: result.title,
                    chunkIndex: 0,
                    content: result.content.slice(0, 800),
                    url: result.url,
                  }))
                ) || kbContext
              }
            }

            if (willGenerateAnalysis) {
              send('analysis_pending', {})
            }

            const answerStream = await streamDocumentAnswer({
              prompt: question,
              context: finalContext,
              mode: intent === 'conversational' ? 'chat' : 'rag',
              history,
              apiKey: userApiKey,
              temperature: ragConfig.temperature,
              systemPrompt,
            })

            for await (const chunk of answerStream) {
              fullContent += chunk
              send('chunk', { content: chunk })
            }

            if (!fullContent && intent === 'document' && qualifiedResults.length === 0 && webResults.length === 0) {
              const tip = toolCallDetected
                ? '联网搜索未找到相关内容，请尝试换一个问法。'
                : '未在知识库中找到相关内容，请尝试换一个问法。'
              fullContent = tip
              send('chunk', { content: tip })
            }

            const sources = mapChatSources(qualifiedResults, webResults)
            send('sources', { sources })

            const savedMessage = await prisma.message.create({
              data: { role: 'assistant', content: fullContent, sources, sessionId: sessionIdFinal },
            })

            send('done', { sessionId: sessionIdFinal, intent, routeMode })

            if (willGenerateAnalysis && fullContent) {
              try {
                const metadata = await extractAnswerMetadata({
                  answer: fullContent,
                  question,
                  context: finalContext,
                  apiKey: userApiKey,
                })
                send('analysis', metadata)
                await prisma.message.update({
                  where: { id: savedMessage.id },
                  data: { analysis: metadata as object },
                })
              } catch (error) {
                console.error('[/api/chat] Metadata extraction failed:', error)
              }
            }

            close()

            prisma.message.count({
              where: { sessionId: sessionIdFinal, role: { in: ['user', 'assistant'] } },
            }).then(async (totalCount) => {
              if (totalCount <= 20) return

              const allMessages = await prisma.message.findMany({
                where: { sessionId: sessionIdFinal, role: { in: ['user', 'assistant'] } },
                orderBy: { createdAt: 'asc' },
                select: { id: true, role: true, content: true },
              })
              const toSummarize = allMessages.slice(0, allMessages.length - 8)
              if (toSummarize.length === 0) return

              try {
                const summary = await summarizeMessages(toSummarize, userApiKey)
                await prisma.$transaction([
                  prisma.chatSession.update({ where: { id: sessionIdFinal }, data: { summary } }),
                  prisma.message.deleteMany({ where: { id: { in: toSummarize.map((message) => message.id) } } }),
                ])
              } catch (error) {
                console.error('[/api/chat] Summarize failed:', error)
              }
            }).catch((error) => console.error('[/api/chat] Count failed:', error))
          } catch (error) {
            console.error('[/api/chat] Stream error:', error)
            send('error', { message: '生成失败，请重试' })
            send('done', { sessionId: sessionIdFinal, intent, routeMode })
            close()
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
