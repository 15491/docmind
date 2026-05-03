import { buildChatMessages, getChatModel, type HistoryMessage } from '@/lib/langchain/model'
import { parseWebSearchQuery, webSearchTool } from '@/lib/langchain/tools/web-search'

export type { HistoryMessage } from '@/lib/langchain/model'

export type StreamEvent =
  | { type: 'content'; chunk: string }
  | { type: 'tool_call'; id: string; query: string }

export async function* streamWithToolDetection(props: {
  prompt: string
  systemPrompt?: string
  history?: HistoryMessage[]
  apiKey?: string | null
  temperature?: number
}): AsyncGenerator<StreamEvent> {
  const {
    prompt,
    systemPrompt = '你是一个专业的文档问答助手。如果知识库文档中已有足够信息，请直接基于文档回答；如果问题涉及实时数据、最新事件或文档中没有的内容，请调用 web_search 工具获取最新信息。',
    history = [],
    apiKey,
    temperature = 0.7,
  } = props

  const model = getChatModel({ apiKey, temperature }).bindTools([webSearchTool])

  const stream = await model.stream(
    buildChatMessages({ prompt, systemPrompt, history })
  )

  let toolCallId = ''
  let toolCallArgs = ''

  for await (const chunk of stream) {
    if (chunk.text) {
      yield { type: 'content', chunk: chunk.text }
    }

    for (const toolChunk of chunk.tool_call_chunks ?? []) {
      if (toolChunk.id) toolCallId = toolChunk.id
      if (toolChunk.args) toolCallArgs += toolChunk.args
    }
  }

  if (toolCallId) {
    yield {
      type: 'tool_call',
      id: toolCallId,
      query: parseWebSearchQuery(toolCallArgs),
    }
  }
}
