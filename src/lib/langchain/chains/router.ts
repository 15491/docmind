import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { getChatModel, type HistoryMessage } from '@/lib/langchain/model'

export interface QuestionRoute {
  mode: 'kb_only' | 'kb_web'
  reason: string
}

export interface RouteQuestionInput {
  question: string
  history?: HistoryMessage[]
  apiKey?: string | null
  hasKnowledgeHits: boolean
}

export async function routeQuestion(input: RouteQuestionInput): Promise<QuestionRoute> {
  const model = getChatModel({ apiKey: input.apiKey, temperature: 0 })

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      '你是一个文档问答系统的路由器。判断当前问题应该只依赖知识库回答，还是需要联网补充。若涉及最新动态、实时数据、知识库明显不足，或用户明确要求外部验证，输出 kb_web；否则输出 kb_only。只输出 kb_only 或 kb_web 两个词之一，不要其他内容。',
    ],
    new MessagesPlaceholder('history'),
    ['human', '用户问题：{question}\n知识库是否命中相关内容：{hasKnowledgeHits}'],
  ])

  const raw = await prompt.pipe(model).pipe(new StringOutputParser()).invoke({
    question: input.question,
    hasKnowledgeHits: input.hasKnowledgeHits ? '是' : '否',
    history: (input.history ?? []).map((message): BaseMessage =>
      message.role === 'user'
        ? new HumanMessage(message.content)
        : new AIMessage(message.content)
    ),
  })

  const mode = raw.trim().includes('kb_web') ? 'kb_web' : 'kb_only'
  return { mode, reason: raw.trim() }
}
