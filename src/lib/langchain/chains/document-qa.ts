import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { getChatModel, type HistoryMessage } from '@/lib/langchain/model'

export interface DocumentSource {
  fileName: string
  chunkIndex: number
  content: string
  url?: string
}

export interface DocumentQaInput {
  prompt: string
  history?: HistoryMessage[]
  systemPrompt?: string
  context?: string
  mode?: 'chat' | 'rag'
  apiKey?: string | null
  temperature?: number
  maxTokens?: number
}

export function formatContext(docSources: DocumentSource[], webSources: DocumentSource[] = []) {
  const docChunks = docSources
    .map((source, index) => `[文档${index + 1}] ${source.fileName}\n${source.content}`)
    .join('\n\n')

  const webChunks = webSources
    .map((source, index) => `[网络${index + 1}] ${source.fileName}${source.url ? `（${source.url}）` : ''}\n${source.content}`)
    .join('\n\n')

  return [
    docChunks && `【知识库文档】\n${docChunks}`,
    webChunks && `【联网搜索结果】\n${webChunks}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

const DEFAULT_RAG_SYSTEM_PROMPT = '你是一个专业的文档问答助手。优先基于知识库文档回答；如果文档证据不足，再结合联网结果补充。回答时要明确区分"文档结论"和"联网补充"，并尽量引用具体来源。'

export async function streamDocumentAnswer(input: DocumentQaInput): Promise<AsyncIterable<string>> {
  const { mode = 'rag', context = '', systemPrompt = DEFAULT_RAG_SYSTEM_PROMPT } = input
  const isChat = mode === 'chat'

  const model = getChatModel({
    apiKey: input.apiKey,
    temperature: input.temperature ?? 0.7,
    maxTokens: input.maxTokens ?? 1024,
  })

  const humanMessage = isChat
    ? '{prompt}'
    : '请根据以下上下文回答用户问题。\n\n{context}\n\n【用户问题】\n{prompt}'

  const promptTemplate = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    new MessagesPlaceholder('history'),
    ['human', humanMessage],
  ])

  const chain = RunnableSequence.from([promptTemplate, model, new StringOutputParser()])

  const invokeInput: Record<string, unknown> = {
    prompt: input.prompt,
    history: (input.history ?? []).map((message): BaseMessage =>
      message.role === 'user'
        ? new HumanMessage(message.content)
        : new AIMessage(message.content)
    ),
  }
  if (!isChat) invokeInput.context = context

  return chain.stream(invokeInput) as Promise<AsyncIterable<string>>
}
