export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

const ZHIPU_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

function getKey(apiKey?: string | null): string {
  const key = apiKey?.trim() || process.env.ZHIPU_API_KEY
  if (!key) throw new Error('Missing ZHIPU_API_KEY environment variable')
  return key
}

// ── Tool Calling（非流式）──────────────────────────────────────────────────────

interface ToolCallResult {
  content: string          // AI 直接回答（无工具调用时）
  toolCall?: {
    id: string
    query: string          // web_search 入参
  }
}

// 第一次调用：非流式，携带 web_search 工具定义，让 GLM 自行决策
export async function callGLMForToolUse(props: {
  prompt: string
  systemPrompt?: string
  history?: HistoryMessage[]
  apiKey?: string | null
}): Promise<ToolCallResult> {
  const {
    prompt,
    systemPrompt = '你是一个专业的文档问答助手。如果知识库文档中已有足够信息，请直接基于文档回答；如果问题涉及实时数据、最新事件或文档中没有的内容，请调用 web_search 工具获取最新信息。',
    history = [],
    apiKey,
  } = props

  const key = getKey(apiKey)

  const response = await fetch(ZHIPU_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: prompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'web_search',
            description: '当知识库文档中没有足够信息，或需要实时/最新数据时，调用此工具搜索互联网',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '用于网络搜索的关键词或问题',
                },
              },
              required: ['query'],
            },
          },
        },
      ],
      tool_choice: 'auto',
      stream: false,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Zhipu AI Tool Use API error: ${response.status} ${error}`)
  }

  const data = await response.json() as {
    choices?: Array<{
      finish_reason: string
      message: {
        content?: string | null
        tool_calls?: Array<{
          id: string
          function: { name: string; arguments: string }
        }>
      }
    }>
  }

  const choice = data.choices?.[0]
  if (!choice) throw new Error('No response from Zhipu AI')

  if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
    const tc = choice.message.tool_calls[0]
    let query = ''
    try {
      const args = JSON.parse(tc.function.arguments) as { query?: string }
      query = args.query ?? ''
    } catch {
      query = tc.function.arguments
    }
    return { content: '', toolCall: { id: tc.id, query } }
  }

  return { content: choice.message.content ?? '' }
}

// ── 流式生成（带可选工具结果）────────────────────────────────────────────────

// 将字符串包装成 ReadableStream（工具调用无需再搜索时直接返回）
export function fakeStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })
}

// 第二次调用：流式，消息尾部携带工具调用 + 工具结果
export async function generateAnswer(props: {
  prompt: string
  systemPrompt?: string
  history?: HistoryMessage[]
  toolResult?: { id: string; content: string }  // web_search 结果
  maxTokens?: number
  apiKey?: string | null
}): Promise<ReadableStream<Uint8Array>> {
  const {
    prompt,
    systemPrompt = '你是一个专业的文档问答助手。请根据用户提供的文档内容进行回答，并在回答中引用具体的文档片段。',
    history = [],
    toolResult,
    maxTokens = 1024,
    apiKey,
  } = props

  const key = getKey(apiKey)

  // 有工具结果时，在 messages 末尾追加工具调用过程
  const toolMessages = toolResult
    ? [
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: toolResult.id,
              type: 'function',
              function: { name: 'web_search', arguments: '{}' },
            },
          ],
        },
        {
          role: 'tool',
          tool_call_id: toolResult.id,
          content: toolResult.content,
        },
      ]
    : []

  const response = await fetch(ZHIPU_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: prompt },
        ...toolMessages,
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

  return response.body || new ReadableStream()
}

// ── SSE 流解析 ────────────────────────────────────────────────────────────────

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
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6)
          if (dataStr === '[DONE]') continue
          try {
            const data = JSON.parse(dataStr) as {
              choices?: Array<{ delta?: { content?: string } }>
              error?: { message: string }
            }
            if (data.error) throw new Error(data.error.message)
            const content = data.choices?.[0]?.delta?.content
            if (content) yield content
          } catch (err) {
            if (err instanceof Error && err.message !== 'Unexpected token') throw err
          }
        }
      }
    }

    if (buffer.startsWith('data: ')) {
      const dataStr = buffer.slice(6)
      if (dataStr !== '[DONE]') {
        try {
          const data = JSON.parse(dataStr) as {
            choices?: Array<{ delta?: { content?: string } }>
            error?: { message: string }
          }
          if (data.error) throw new Error(data.error.message)
          const content = data.choices?.[0]?.delta?.content
          if (content) yield content
        } catch (err) {
          if (err instanceof Error && err.message !== 'Unexpected token') throw err
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
