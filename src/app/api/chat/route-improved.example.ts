import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { embedText, searchVectors } from '@/lib/rag/embeddings'
import { generateAnswer, parseStreamContent } from '@/lib/rag/generation'
import { validateRequest } from '@/lib/validate-request'
import { chatSchema, type ChatInput } from '@/lib/validators'

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

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: '请求格式错误' },
        { status: 400 }
      )
    }

    // 使用 Zod 验证请求体
    const validation = validateRequest<ChatInput>(body, chatSchema)
    if (validation instanceof NextResponse) {
      return validation
    }

    const { question, kbId, sessionId } = validation

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

    // 创建或获取会话
    let chatSession = sessionId
      ? await prisma.chatSession.findUnique({
        where: { id: sessionId },
      })
      : null

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          title: question.slice(0, 50),
          knowledgeBaseId: kbId,
        },
      })
    }

    // 保存用户消息
    await prisma.message.create({
      data: {
        role: 'user',
        content: question,
        sessionId: chatSession.id,
      },
    })

    // 问题向量化
    let questionEmbedding: number[]
    try {
      questionEmbedding = await embedText(question)
    } catch (error) {
      console.error('[/api/chat] Embedding error:', error)
      return NextResponse.json(
        { error: 'EMBEDDING_ERROR', message: '问题处理失败' },
        { status: 500 }
      )
    }

    // 向量检索
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

    // 无匹配内容处理
    if (searchResults.length === 0) {
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
                `event: done\ndata: {"sessionId":"${chatSession.id}"}\n\n`
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

    // 调用 GLM API
    let glmResponse
    try {
      glmResponse = await generateAnswer({
        prompt,
        systemPrompt:
          '你是一个专业的文档问答助手。请根据提供的文档内容准确回答用户问题，并在答案中引用具体的文档片段。',
      })
    } catch (error) {
      console.error('[/api/chat] Generation error:', error)
      return NextResponse.json(
        { error: 'GENERATION_ERROR', message: '生成回答失败' },
        { status: 500 }
      )
    }

    // 返回 SSE 流
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

            // 保存 AI 回答
            await prisma.message.create({
              data: {
                role: 'assistant',
                content: fullContent,
                sources: sources as unknown as Record<string, unknown>,
                sessionId: chatSession.id,
              },
            })

            // 完成事件
            controller.enqueue(
              new TextEncoder().encode(
                `event: done\ndata: ${JSON.stringify({ sessionId: chatSession.id })}\n\n`
              )
            )

            controller.close()
          } catch (error) {
            console.error('[/api/chat] Stream error:', error)
            controller.error(error)
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
