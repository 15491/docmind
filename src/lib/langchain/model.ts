import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import type { BaseMessageLike } from '@langchain/core/messages'
import { getZhipuBaseUrl } from '@/lib/zhipu-config'

export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

interface BuildMessagesOptions {
  prompt: string
  systemPrompt: string
  history?: HistoryMessage[]
  toolResult?: { id: string; content: string }
}

const DEFAULT_MODEL = 'glm-4-flash'

function getApiKey(apiKey?: string | null): string {
  const key = apiKey?.trim() || process.env.ZHIPU_API_KEY?.trim()
  if (!key) throw new Error('Missing ZHIPU_API_KEY environment variable')
  return key
}

export function getChatModel(props?: {
  apiKey?: string | null
  temperature?: number
  model?: string
  maxTokens?: number
}) {
  const { apiKey, temperature = 0.7, model = DEFAULT_MODEL, maxTokens } = props ?? {}

  return new ChatOpenAI({
    apiKey: getApiKey(apiKey),
    model,
    temperature,
    maxTokens,
    configuration: {
      baseURL: getZhipuBaseUrl(),
    },
  })
}

export function buildChatMessages({
  prompt,
  systemPrompt,
  history = [],
  toolResult,
}: BuildMessagesOptions): BaseMessageLike[] {
  const messages: BaseMessageLike[] = [
    new SystemMessage(systemPrompt),
    ...history.map((message) =>
      message.role === 'user'
        ? new HumanMessage(message.content)
        : new AIMessage(message.content)
    ),
    new HumanMessage(prompt),
  ]

  if (toolResult) {
    messages.push(
      new AIMessage({
        content: '',
        tool_calls: [
          {
            id: toolResult.id,
            name: 'web_search',
            args: {},
          },
        ],
      }),
      new ToolMessage({
        content: toolResult.content,
        tool_call_id: toolResult.id,
        name: 'web_search',
      })
    )
  }

  return messages
}
