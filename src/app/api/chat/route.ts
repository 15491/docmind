import { NextRequest, NextResponse } from 'next/server'
import { Err } from '@/lib/response'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { embedText, searchVectors } from '@/lib/rag/embeddings'
import { generateAnswer, callGLMForToolUse, fakeStream, parseStreamContent, type HistoryMessage } from '@/lib/rag/generation'
import { summarizeMessages } from '@/lib/rag/summarize'
import { webSearch, type WebResult } from '@/lib/web-search'
import { rateLimit } from '@/lib/rate-limit'
import { getUserApiKey } from '@/lib/get-api-key'

interface ChatRequest {
  question: string
  kbId: string
  sessionId?: string
}

// POST /api/chat — SSE 流式问答
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Err.unauthorized()

    const { ok } = await rateLimit(`rl:chat:${session.user.id}`, 20, 60)
    if (!ok) return Err.tooMany('操作过于频繁，请稍后再试')

    const body = await req.json() as ChatRequest
    const { question, kbId, sessionId } = body

    if (!question?.trim()) return Err.invalid('问题不能为空')
    if (!kbId)             return Err.invalid('缺少知识库ID')

    const kb = await prisma.knowledgeBase.findUnique({ where: { id: kbId } })
    if (!kb)                           return Err.notFound('知识库不存在')
    if (kb.userId !== session.user.id) return Err.forbidden('无权访问此知识库')

    // 获取用户的 API Key
    const userApiKey = await getUserApiKey(session.user.id)

    // 创建或获取会话
    let session_record = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null

    if (session_record && session_record.knowledgeBaseId !== kbId) {
      return Err.forbidden('会话不属于此知识库')
    }

    if (!session_record) {
      session_record = await prisma.chatSession.create({
        data: {
          title: question.slice(0, 50),
          knowledgeBaseId: kbId,
        },
      })
    }

    // 获取历史消息（保存当前消息之前，避免包含自身）
    const recentMessages = await prisma.message.findMany({
      where: {
        sessionId: session_record.id,
        role: { in: ['user', 'assistant'] },
      },
      orderBy: { createdAt: 'asc' },
      take: -8,
      select: { role: true, content: true },
    })
    const history: HistoryMessage[] = recentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // 若 session 有摘要，以 user→assistant 对的形式 prepend（顺序：user 在前）
    if (session_record.summary) {
      history.unshift({ role: 'assistant', content: '好的，我已了解之前的对话内容，请继续。' })
      history.unshift({ role: 'user', content: `[对话历史摘要]\n${session_record.summary}` })
    }

    // 保存用户消息
    await prisma.message.create({
      data: {
        role: 'user',
        content: question,
        sessionId: session_record.id,
      },
    })

    // 问题向量化
    let questionEmbedding: number[]
    try {
      questionEmbedding = await embedText(question, userApiKey)
    } catch (error) {
      console.error('[/api/chat] Embedding error:', error)
      return Err.internal('问题处理失败')
    }

    // 向量检索知识库
    let searchResults
    try {
      searchResults = await searchVectors({ embedding: questionEmbedding, kbId, topK: 5 })
    } catch (error) {
      console.error('[/api/chat] Search error:', error)
      return Err.internal('检索失败')
    }

    // 组装文档 context
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

    const systemPrompt = '你是一个专业的文档问答助手。如果知识库文档中已有足够信息，请直接基于文档回答；如果问题涉及实时数据、最新事件或文档中没有的内容，请调用 web_search 工具获取最新信息。'

    // Tool Calling：第一次非流式调用，让 GLM 决定是否联网
    let toolCheckResult
    try {
      toolCheckResult = await callGLMForToolUse({
        prompt: buildPrompt(),
        systemPrompt,
        history,
        apiKey: userApiKey,
      })
    } catch (error) {
      console.error('[/api/chat] Tool use check error:', error)
      return Err.internal('生成回答失败')
    }

    // 根据是否触发工具调用决定后续流程
    let webResults: WebResult[] = []
    let toolResultPayload: { id: string; content: string } | undefined

    if (toolCheckResult.toolCall) {
      // GLM 决定联网搜索
      try {
        webResults = await webSearch(toolCheckResult.toolCall.query)
      } catch (err) {
        console.error('[/api/chat] Web search error:', err)
        // 搜索失败不阻断，降级到无网络结果
      }
      toolResultPayload = {
        id: toolCheckResult.toolCall.id,
        content: webResults.length > 0
          ? webResults.map((r, i) => `[${i + 1}] ${r.title}（${r.url}）\n${r.content}`).join('\n\n')
          : '未找到相关网络结果',
      }
    }

    // 若知识库和网络均无结果，直接返回提示
    if (searchResults.length === 0 && webResults.length === 0 && !toolCheckResult.toolCall) {
      return new NextResponse(
        new ReadableStream({
          async start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'event: chunk\ndata: {"content":"未在知识库中找到相关内容，请尝试换个问法。"}\n\n'
              )
            )
            controller.enqueue(
              new TextEncoder().encode(
                `event: done\ndata: {"sessionId":"${session_record.id}"}\n\n`
              )
            )
            controller.close()
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
    }

    // 准备最终流式响应（无工具调用时用 fakeStream 包装直接回答）
    let glmResponse: ReadableStream<Uint8Array>
    try {
      if (toolCheckResult.toolCall) {
        // 第二次调用（流式），携带工具结果
        glmResponse = await generateAnswer({
          prompt: buildPrompt(webResults),
          systemPrompt,
          history,
          toolResult: toolResultPayload,
          apiKey: userApiKey,
        })
      } else {
        // GLM 已直接回答，包装为假流
        glmResponse = fakeStream(toolCheckResult.content)
      }
    } catch (error) {
      console.error('[/api/chat] Generation error:', error)
      return Err.internal('生成回答失败')
    }

    // 返回 SSE 流式响应
    return new NextResponse(
      new ReadableStream({
        async start(controller) {
          try {
            // 通知前端正在联网搜索（在流开始前发出）
            if (toolCheckResult.toolCall) {
              controller.enqueue(
                new TextEncoder().encode(
                  `event: tool_call\ndata: ${JSON.stringify({ query: toolCheckResult.toolCall.query })}\n\n`
                )
              )
            }

            let fullContent = ''

            // 流式输出文本
            for await (const chunk of parseStreamContent(glmResponse)) {
              fullContent += chunk
              controller.enqueue(
                new TextEncoder().encode(
                  `event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`
                )
              )
            }

            // 发送引用来源（文档 + 联网结果）
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

            controller.enqueue(
              new TextEncoder().encode(
                `event: sources\ndata: ${JSON.stringify({ sources })}\n\n`
              )
            )

            // 保存 AI 回答消息
            await prisma.message.create({
              data: {
                role: 'assistant',
                content: fullContent,
                sources: sources,
                sessionId: session_record.id,
              },
            })

            // 滚动摘要：消息超过 20 条时压缩旧消息
            const totalCount = await prisma.message.count({
              where: {
                sessionId: session_record.id,
                role: { in: ['user', 'assistant'] },
              },
            })
            if (totalCount > 20) {
              const allMessages = await prisma.message.findMany({
                where: {
                  sessionId: session_record.id,
                  role: { in: ['user', 'assistant'] },
                },
                orderBy: { createdAt: 'asc' },
                select: { id: true, role: true, content: true },
              })
              const toSummarize = allMessages.slice(0, allMessages.length - 8)
              if (toSummarize.length > 0) {
                try {
                  const summary = await summarizeMessages(toSummarize, userApiKey)
                  await prisma.$transaction([
                    prisma.chatSession.update({
                      where: { id: session_record.id },
                      data: { summary },
                    }),
                    prisma.message.deleteMany({
                      where: { id: { in: toSummarize.map((m) => m.id) } },
                    }),
                  ])
                } catch (err) {
                  console.error('[/api/chat] Summarize failed:', err)
                }
              }
            }

            // 发送完成事件
            controller.enqueue(
              new TextEncoder().encode(
                `event: done\ndata: ${JSON.stringify({ sessionId: session_record.id })}\n\n`
              )
            )

            controller.close()
          } catch (error) {
            console.error('[/api/chat] Stream error:', error)
            try {
              controller.enqueue(
                new TextEncoder().encode(
                  `event: error\ndata: ${JSON.stringify({ message: '生成失败，请重试' })}\n\n`
                )
              )
              controller.enqueue(
                new TextEncoder().encode(
                  `event: done\ndata: ${JSON.stringify({ sessionId: session_record.id })}\n\n`
                )
              )
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
}
