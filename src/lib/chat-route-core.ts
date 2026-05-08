import type { HistoryMessage } from './rag/generation'
import type { WebResult } from './web-search'

export interface RetrievedChunk {
  id: string
  content: string
  fileName: string
  chunkIndex: number
  similarity: number
}

export const SIMILARITY_THRESHOLD = 0.4

const REALTIME_KEYWORDS = /最新|今天|现在|最近|当前|实时|今年|本周|本月|刚才|刚刚|几点|什么时候/
const CONVERSATIONAL_PATTERNS = [
  /^(你好|您好|hi|hello|hey)\b/i,
  /^(谢谢|感谢|多谢|thanks)/i,
  /^(再见|拜拜|goodbye|bye)/i,
  /^(我叫|我是|我的名字是|大家好|我想告诉你)/,
  /^(你是谁|你叫什么|你能做什么|你有什么功能|介绍一下你自己)/,
  /^(好的|明白|知道了|好|嗯|哦|啊|ok|okay)\s*[。！.!]?\s*$/i,
]
const DOCUMENT_KEYWORDS = /文档|知识库|资料|文件|报告|方案|条款|章节|内容|说明|规定|政策|手册|合同|协议|数据|统计|分析|总结|描述|提到|提及|写了|说了|记录|根据/

export const CHAT_SYSTEM_PROMPT = '你是一名友好的智能助手。记住用户在对话中告知的所有个人信息（如姓名、偏好等），并在后续对话中自然地使用。回答简洁、自然。'
export const DOC_SYSTEM_PROMPT = '你是一名专业的文档问答助手。优先基于知识库文档回答；文档证据不足时，再结合联网结果补充。回答时引用具体来源，区分“文档结论”和“联网补充”。'

export function classifyChatIntent(question: string): 'conversational' | 'document' {
  const trimmed = question.trim()

  if (trimmed.length <= 8) return 'conversational'
  if (DOCUMENT_KEYWORDS.test(trimmed)) return 'document'

  for (const pattern of CONVERSATIONAL_PATTERNS) {
    if (pattern.test(trimmed)) return 'conversational'
  }

  return 'document'
}

export function heuristicChatRoute(
  question: string,
  hasQualifiedHits: boolean
): 'kb_only' | 'kb_web' {
  if (!hasQualifiedHits) return 'kb_web'
  if (REALTIME_KEYWORDS.test(question)) return 'kb_web'
  return 'kb_only'
}

export function filterQualifiedChunks(
  results: RetrievedChunk[],
  threshold = SIMILARITY_THRESHOLD
) {
  return results.filter((result) => result.similarity >= threshold)
}

export function mapChatSources(searchResults: RetrievedChunk[], webResults: WebResult[]) {
  return [
    ...searchResults.map((result) => ({
      fileName: result.fileName,
      chunkIndex: result.chunkIndex,
      content: result.content.slice(0, 200),
    })),
    ...webResults.map((result) => ({
      fileName: result.title,
      chunkIndex: 0,
      content: result.content.slice(0, 200),
      url: result.url,
    })),
  ]
}

export function buildChatHistory(
  recentMessages: HistoryMessage[],
  summary?: string | null
): HistoryMessage[] {
  const history = [...recentMessages]
  if (summary) {
    history.unshift({ role: 'assistant', content: '好的，我已了解之前的对话内容，请继续。' })
    history.unshift({ role: 'user', content: `[对话历史摘要]\n${summary}` })
  }
  return history
}
