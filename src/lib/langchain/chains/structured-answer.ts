import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { getChatModel } from '@/lib/langchain/model'
import { answerSchema } from '@/lib/langchain/schemas/answer'

export interface AnswerMetadata {
  evidence: string[]
  confidence: 'high' | 'medium' | 'low'
  followUp: string[]
}

function parseMetadata(raw: string): AnswerMetadata {
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as unknown
      const schema = answerSchema.pick({ evidence: true, confidence: true, followUp: true })
      return schema.parse(parsed)
    }
  } catch {
    // fall through
  }
  return { evidence: [], confidence: 'medium', followUp: [] }
}

export async function extractAnswerMetadata(props: {
  answer: string
  question: string
  context: string
  apiKey?: string | null
}): Promise<AnswerMetadata> {
  const model = getChatModel({ apiKey: props.apiKey, temperature: 0, maxTokens: 512 })

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      '你是一个信息提炼助手。根据已有回答和上下文，提取关键证据、置信度和建议追问。必须严格按 JSON 输出：{{"evidence":["证据1"],"confidence":"high","followUp":["追问1"]}}，confidence 只能是 high/medium/low，不要其他内容。',
    ],
    [
      'human',
      '用户问题：{question}\n\n参考上下文：\n{context}\n\n已生成的回答：\n{answer}\n\n请提炼 evidence、confidence、followUp。',
    ],
  ])

  const raw = await prompt.pipe(model).pipe(new StringOutputParser()).invoke({
    question: props.question,
    context: props.context,
    answer: props.answer,
  })

  return parseMetadata(raw)
}
