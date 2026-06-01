import { prisma } from '@/lib/infra/prisma'
import { streamWithToolDetection, type HistoryMessage } from '@/lib/rag/generation'
import { summarizeMessages } from '@/lib/rag/summarize'
import { webSearch, type WebResult } from '@/lib/web-search'
import { formatContext, streamDocumentAnswer } from '@/lib/langchain/chains/document-qa'
import { extractAnswerMetadata } from '@/lib/langchain/chains/structured-answer'
import { KnowledgeBaseRetriever } from '@/lib/langchain/retrievers/kb-retriever'
import {
  buildChatHistory,
  CHAT_SYSTEM_PROMPT,
  classifyChatIntent,
  DOC_SYSTEM_PROMPT,
  filterQualifiedChunks,
  heuristicChatRoute,
  mapChatSources,
  type RetrievedChunk,
} from '@/lib/route-core/chat-route-core'

export type ChatPipelineEvent =
  | { type: 'analysis_pending' }
  | { type: 'tool_call'; query: string }
  | { type: 'chunk'; content: string }
  | { type: 'sources'; sources: ReturnType<typeof mapChatSources> }
  | { type: 'analysis'; evidence: string[]; confidence: string; followUp: string[] }
  | { type: 'done'; sessionId: string; intent: string; routeMode: string }
  | { type: 'error'; message: string }

export interface ChatPipelineInput {
  question: string
  kbId: string
  sessionId?: string | null
  apiKey?: string | null
  ragConfig: { topK: number; temperature: number }
}

async function getOrCreateSession(kbId: string, sessionId: string | null | undefined, question: string) {
  if (sessionId) {
    const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } })
    if (existing) return existing
  }
  return prisma.chatSession.create({
    data: { title: question.slice(0, 50), knowledgeBaseId: kbId },
  })
}

async function loadRecentHistory(sessionId: string, summary: string | null): Promise<HistoryMessage[]> {
  const rows = await prisma.message.findMany({
    where: { sessionId, role: { in: ['user', 'assistant'] } },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { role: true, content: true },
  })
  const recent = rows.reverse().map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
  return buildChatHistory(recent, summary)
}

function scheduleSessionSummarization(sessionId: string, apiKey: string | null | undefined): void {
  prisma.message
    .count({ where: { sessionId, role: { in: ['user', 'assistant'] } } })
    .then(async (total) => {
      if (total <= 20) return
      const all = await prisma.message.findMany({
        where: { sessionId, role: { in: ['user', 'assistant'] } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, content: true },
      })
      const toSummarize = all.slice(0, all.length - 8)
      if (toSummarize.length === 0) return
      const summary = await summarizeMessages(toSummarize, apiKey)
      await prisma.$transaction([
        prisma.chatSession.update({ where: { id: sessionId }, data: { summary } }),
        prisma.message.deleteMany({ where: { id: { in: toSummarize.map((m) => m.id) } } }),
      ])
    })
    .catch((err) => console.error('[chat-pipeline] Summarize failed:', err))
}

export async function* runChatPipeline(input: ChatPipelineInput): AsyncGenerator<ChatPipelineEvent> {
  const { question, kbId, sessionId, apiKey, ragConfig } = input

  const session = await getOrCreateSession(kbId, sessionId, question)
  const history = await loadRecentHistory(session.id, session.summary)

  await prisma.message.create({
    data: { role: 'user', content: question, sessionId: session.id },
  })

  const intent = classifyChatIntent(question)

  let searchResults: RetrievedChunk[] = []
  if (intent === 'document') {
    try {
      const retriever = new KnowledgeBaseRetriever({ kbId, apiKey, topK: ragConfig.topK })
      const docs = await retriever.invoke(question)
      searchResults = docs.map((doc) => ({
        id: doc.id ?? '',
        content: doc.pageContent,
        fileName: doc.metadata.fileName,
        chunkIndex: doc.metadata.chunkIndex,
        similarity: doc.metadata.similarity,
      }))
    } catch (err) {
      console.error('[chat-pipeline] Retrieval error:', err)
      yield { type: 'error', message: '检索失败' }
      return
    }
  }

  const qualifiedChunks = filterQualifiedChunks(searchResults)
  const routeMode = intent === 'document'
    ? heuristicChatRoute(question, qualifiedChunks.length > 0)
    : 'kb_only'
  const systemPrompt = intent === 'conversational' ? CHAT_SYSTEM_PROMPT : DOC_SYSTEM_PROMPT
  const willGenerateAnalysis = intent === 'document' && qualifiedChunks.length > 0

  let webResults: WebResult[] = []
  let finalContext = ''

  if (intent === 'document') {
    const kbContext = formatContext(
      qualifiedChunks.map((r) => ({
        fileName: r.fileName,
        chunkIndex: r.chunkIndex,
        content: r.content.slice(0, 800),
      }))
    )
    finalContext = kbContext

    if (routeMode === 'kb_web') {
      let toolQuery = ''
      const generator = streamWithToolDetection({
        prompt: question,
        systemPrompt,
        history,
        apiKey,
        temperature: ragConfig.temperature,
      })
      for await (const event of generator) {
        if (event.type === 'tool_call') {
          toolQuery = event.query
          yield { type: 'tool_call', query: event.query }
        }
      }
      if (toolQuery) {
        try {
          webResults = await webSearch(toolQuery)
        } catch (err) {
          console.error('[chat-pipeline] Web search error:', err)
        }
      }
      finalContext =
        formatContext(
          qualifiedChunks.map((r) => ({
            fileName: r.fileName,
            chunkIndex: r.chunkIndex,
            content: r.content.slice(0, 800),
          })),
          webResults.map((r) => ({
            fileName: r.title,
            chunkIndex: 0,
            content: r.content.slice(0, 800),
            url: r.url,
          }))
        ) || kbContext
    }
  }

  if (willGenerateAnalysis) {
    yield { type: 'analysis_pending' }
  }

  let fullContent = ''
  const answerStream = await streamDocumentAnswer({
    prompt: question,
    context: finalContext,
    mode: intent === 'conversational' ? 'chat' : 'rag',
    history,
    apiKey,
    temperature: ragConfig.temperature,
    systemPrompt,
  })
  for await (const chunk of answerStream) {
    fullContent += chunk
    yield { type: 'chunk', content: chunk }
  }

  if (!fullContent && intent === 'document' && qualifiedChunks.length === 0 && webResults.length === 0) {
    const tip = '未在知识库中找到相关内容，请尝试换一个问法。'
    fullContent = tip
    yield { type: 'chunk', content: tip }
  }

  const sources = mapChatSources(qualifiedChunks, webResults)
  yield { type: 'sources', sources }

  const savedMessage = await prisma.message.create({
    data: { role: 'assistant', content: fullContent, sources, sessionId: session.id },
  })

  yield { type: 'done', sessionId: session.id, intent, routeMode }

  if (willGenerateAnalysis && fullContent) {
    try {
      const metadata = await extractAnswerMetadata({
        answer: fullContent,
        question,
        context: finalContext,
        apiKey,
      })
      yield { type: 'analysis', ...metadata }
      await prisma.message.update({
        where: { id: savedMessage.id },
        data: { analysis: metadata as object },
      })
    } catch (err) {
      console.error('[chat-pipeline] Metadata extraction failed:', err)
    }
  }

  scheduleSessionSummarization(session.id, apiKey)
}
