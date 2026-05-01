import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { embedText, searchVectors } from '@/lib/rag/embeddings'
import { generateAnswer, parseStreamContent } from '@/lib/rag/generation'
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
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { ok } = await rateLimit(`rl:chat:${session.user.id}`, 20, 60)
    if (!ok) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: '操作过于频繁，请稍后再试' },
        { status: 429 }
      )
    }

    const body = await req.json() as ChatRequest
    const { question, kbId, sessionId } = body

    if (!question?.trim()) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '问题不能为空' },
        { status: 422 }
      )
    }

    if (!kbId) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '缺少知识库ID' },
        { status: 422 }
      )
    }

    // 验证知识库归属权
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id: kbId },
    })

    if (!kb) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '知识库不存在' },
        { status: 404 }
      )
    }

    if (kb.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '无权访问此知识库' },
        { status: 403 }
      )
    }

    // 获取用户的 API Key
    const userApiKey = await getUserApiKey(session.user.id)

    // 创建或获取会话
    let session_record = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null

    if (session_record && session_record.knowledgeBaseId !== kbId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '会话不属于此知识库' },
        { status: 403 }
      )
    }

    if (!session_record) {
      session_record = await prisma.chatSession.create({
        data: {
          title: question.slice(0, 50),
          knowledgeBaseId: kbId,
        },
      })
    }

    // 保存用户消息
    const userMessage = await prisma.message.create({
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
      return NextResponse.json(
        { error: 'EMBEDDING_ERROR', message: '问题处理失败' },
        { status: 500 }
      )
    }

    // 向量检索相关 chunks
    let searchResults
    try {
      searchResults = await searchVectors({
        embedding: questionEmbedding,
        kbId,
        topK: 5,
      })
    } catch (error) {
      console.error('[/api/chat] Search error:', error)
      return NextResponse.json(
        { error: 'SEARCH_ERROR', message: '检索失败' },
        { status: 500 }
      )
    }

    if (searchResults.length === 0) {
      // 无匹配内容
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

    // 组装 Prompt
    const contextChunks = searchResults
      .map((r, i) => `[文档${i + 1}] ${r.fileName}\n${r.content}`)
      .join('\n\n')

    const prompt = `基于以下文档内容回答问题。如果答案在文档中，请引用文档名称和相关内容。

【参考文档】
${contextChunks}

【用户问题】
${question}`

    // 调用 GLM API 流式生成
    let glmResponse
    try {
      glmResponse = await generateAnswer({
        prompt,
        systemPrompt: '你是一个专业的文档问答助手。请根据提供的文档内容准确回答用户问题，并在答案中引用具体的文档片段。',
        apiKey: userApiKey,
      })
    } catch (error) {
      console.error('[/api/chat] Generation error:', error)
      return NextResponse.json(
        { error: 'GENERATION_ERROR', message: '生成回答失败' },
        { status: 500 }
      )
    }

    // 返回 SSE 流式响应
    return new NextResponse(
      new ReadableStream({
        async start(controller) {
          try {
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

            // 发送引用来源
            const sources = searchResults.map(r => ({
              fileName: r.fileName,
              chunkIndex: r.chunkIndex,
              content: r.content.slice(0, 200),
            }))

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
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '处理失败' },
      { status: 500 }
    )
  }
}
