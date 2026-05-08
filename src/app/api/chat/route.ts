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

interface RetrievedChunk {
  id: string
  content: string
  fileName: string
  chunkIndex: number
  similarity: number
}

// 相似度低于此阈值的检索结果视为无效命中
const SIMILARITY_THRESHOLD = 0.4

// 实时信息关键词，触发联网搜索
const REALTIME_KEYWORDS = /最新|今天|现在|最近|当前|实时|今年|本周|本月|刚才|刚刚|几点|什么时候/

// 明确的对话类开头模式
const CONVERSATIONAL_PATTERNS = [
  /^(你好|您好|hi|hello|hey)\b/i,
  /^(谢谢|感谢|多谢|thanks)/i,
  /^(再见|拜拜|goodbye|bye)/i,
  /^(我叫|我是|我的名字是|大家好|我想告诉你)/,
  /^(你是谁|你叫什么|你能做什么|你有什么功能|介绍一下你自己)/,
  /^(好的|明白|知道了|好|嗯|哦|啊|ok|okay)\s*[。！.!]?\s*$/i,
]

// 明确需要查文档的关键词
const DOCUMENT_KEYWORDS = /文档|知识库|资料|文件|报告|方案|条款|章节|内容|说明|规定|政策|手册|合同|协议|数据|统计|分析|总结|描述|提到|提及|写了|说了|记录|根据/

function classifyIntent(question: string): 'conversational' | 'document' {
  const trimmed = question.trim()

  // 极短消息视为对话
  if (trimmed.length <= 8) return 'conversational'

  // 含文档关键词 → 文档查询
  if (DOCUMENT_KEYWORDS.test(trimmed)) return 'document'

  // 匹配对话模式
  for (const pattern of CONVERSATIONAL_PATTERNS) {
    if (pattern.test(trimmed)) return 'conversational'
  }

  // 默认走文档查询（保守兜底，避免漏掉真实查询）
  return 'document'
}

function heuristicRoute(question: string, hasQualifiedHits: boolean): 'kb_only' | 'kb_web' {
  if (!hasQualifiedHits) return 'kb_web'
  if (REALTIME_KEYWORDS.test(question)) return 'kb_web'
  return 'kb_only'
}

function mapSources(searchResults: RetrievedChunk[], webResults: WebResult[]) {
  return [
    ...searchResults.map((result) => ({
      fileName: result.fileName,
      chunkIndex: result.chunkIndex,
      content: result.content.slice(0, 200),
    })),
    ...webResults.map((result) => ({
      fileName: result.title,
      chunkIndex: 0,
      content: result.content.slice(0, 200),
      url: result.url,
    })),
  ]
}

const CHAT_SYSTEM_PROMPT = '你是一名友好的智能助手。记住用户在对话中告知的所有个人信息（如姓名、偏好等），并在后续对话中自然地使用。回答简洁、自然。'

const DOC_SYSTEM_PROMPT = '你是一名专业的文档问答助手。优先基于知识库文档回答；文档证据不足时，再结合联网结果补充。回答时引用具体来源，区分"文档结论"和"联网补充"。'

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

    const history: HistoryMessage[] = recentMessages.map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    }))

    if (sessionRecord.summary) {
      history.unshift({ role: 'assistant', content: '好的，我已了解之前的对话内容，请继续。' })
      history.unshift({ role: 'user', content: `[对话历史摘要]\n${sessionRecord.summary}` })
    }

    await prisma.message.create({
      data: { role: 'user', content: question, sessionId: sessionRecord.id },
    })

    // ① 意图分类：决定是否需要向量检索
    const intent = classifyIntent(question)
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

    // ② 过滤低相似度结果
    const qualifiedResults = searchResults.filter((r) => r.similarity >= SIMILARITY_THRESHOLD)

    const routeMode = intent === 'document'
      ? heuristicRoute(question, qualifiedResults.length > 0)
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
            try { controller.close() } catch { /* already closed externally */ }
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

              // kb_web：检测是否需要联网，合并上下文
              if (routeMode === 'kb_web') {
                const gen = streamWithToolDetection({
                  prompt: question,
                  systemPrompt,
                  history,
                  apiKey: userApiKey,
                  temperature: ragConfig.temperature,
                })

                let toolQuery = ''
                for await (const event of gen) {
                  if (event.type === 'tool_call') {
                    toolCallDetected = true
                    toolQuery = event.query
                    send('tool_call', { query: event.query })
                  }
                }

                if (toolCallDetected && toolQuery) {
                  try {
                    webResults = await webSearch(toolQuery)
                  } catch (err) {
                    console.error('[/api/chat] Web search error:', err)
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

            // ③ 真流式输出
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

            const sources = mapSources(qualifiedResults, webResults)
            send('sources', { sources })

            const savedMessage = await prisma.message.create({
              data: { role: 'assistant', content: fullContent, sources, sessionId: sessionIdFinal },
            })

            // done 先发：客户端 loading 立即停止，用户可继续交互
            send('done', { sessionId: sessionIdFinal, intent, routeMode })

            // ④ 文档模式提取结构化元数据（done 之后，不阻塞交互），同步持久化
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
              } catch (err) {
                console.error('[/api/chat] Metadata extraction failed:', err)
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
              } catch (err) {
                console.error('[/api/chat] Summarize failed:', err)
              }
            }).catch((err) => console.error('[/api/chat] Count failed:', err))
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
