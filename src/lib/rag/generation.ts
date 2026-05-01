// 调用智谱AI GLM-4-Flash API，支持流式输出
export async function generateAnswer(props: {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  apiKey?: string | null
}): Promise<ReadableStream<Uint8Array>> {
  const {
    prompt,
    systemPrompt = '你是一个专业的文档问答助手。请根据用户提供的文档内容进行回答，并在回答中引用具体的文档片段。',
    maxTokens = 1024,
    apiKey,
  } = props

  const key = apiKey?.trim() || process.env.ZHIPU_API_KEY
  if (!key) {
    throw new Error('Missing ZHIPU_API_KEY environment variable')
  }

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Zhipu AI Chat API error: ${response.status} ${error}`)
  }

  // 返回 ReadableStream，逐行解析 SSE 消息
  return response.body || new ReadableStream()
}

// 解析 SSE 流，提取文本内容
export async function* parseStreamContent(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // 保留最后一行（可能不完整）
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6)
          if (dataStr === '[DONE]') continue

          try {
            const data = JSON.parse(dataStr) as {
              choices?: Array<{
                delta?: { content?: string };
              }>;
              error?: { message: string };
            }
            if (data.error) {
              throw new Error(data.error.message)
            }
            const content = data.choices?.[0]?.delta?.content
            if (content) {
              yield content
            }
          } catch (err) {
            // 忽略 JSON 解析错误但抛出真实的 API 错误
            if (err instanceof Error && err.message !== 'Unexpected token') {
              throw err
            }
          }
        }
      }
    }

    // 处理最后的缓冲区
    if (buffer.startsWith('data: ')) {
      const dataStr = buffer.slice(6)
      if (dataStr !== '[DONE]') {
        try {
          const data = JSON.parse(dataStr) as {
            choices?: Array<{
              delta?: { content?: string };
            }>;
            error?: { message: string };
          }
          if (data.error) {
            throw new Error(data.error.message)
          }
          const content = data.choices?.[0]?.delta?.content
          if (content) {
            yield content
          }
        } catch (err) {
          if (err instanceof Error && err.message !== 'Unexpected token') {
            throw err
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
