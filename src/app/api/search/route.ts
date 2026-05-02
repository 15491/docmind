import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { embedText } from '@/lib/rag/embeddings'
import { rateLimit } from '@/lib/rate-limit'
import { getUserContext } from '@/lib/get-api-key'
import { searchChunks } from '@/lib/elasticsearch'
import { R, Err } from '@/lib/response'

interface SearchRequest {
  query: string
  topK?: number
}

interface SearchResult {
  id: string
  docName: string
  kbName: string
  kbId: string
  chunk: number
  score: number
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Err.unauthorized()
    }

    const { ok } = await rateLimit(`rl:search:${session.user.id}`, 30, 60)
    if (!ok) {
      return Err.tooMany('搜索过于频繁，请稍后再试')
    }

    const body = await req.json() as SearchRequest
    const { query, topK: rawTopK } = body

    if (!query || query.trim().length === 0) {
      return Err.invalid('搜索关键词不能为空')
    }

    // 一次查询获取 API Key + RAG 配置
    const { apiKey: userApiKey, ragConfig } = await getUserContext(session.user.id)
    // 请求方指定的 topK 优先，否则用用户配置，再否则用默认 10
    const topK = rawTopK !== undefined
      ? Math.min(Math.max(Math.floor(rawTopK), 1), 50)
      : Math.min(ragConfig.topK, 50)

    // 获取查询的向量表示
    const queryEmbedding = await embedText(query.trim(), userApiKey)

    // 跨知识库向量搜索（Elasticsearch）
    const esResults = await searchChunks({
      embedding: queryEmbedding,
      userId: session.user.id,
      topK,
    })

    // 获取 Document 和 KnowledgeBase 信息
    const documentIds = [...new Set(esResults.map(r => r.documentId))]
    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds }, status: 'ready' },
      select: {
        id: true,
        fileName: true,
        knowledgeBaseId: true,
        knowledgeBase: { select: { name: true } },
      },
    })

    const docMap = new Map(documents.map(d => [d.id, d]))

    const searchResults: SearchResult[] = esResults
      .map(r => {
        const doc = docMap.get(r.documentId)
        if (!doc) return null
        return {
          id: r.id,
          docName: r.fileName,
          kbName: doc.knowledgeBase.name,
          kbId: doc.knowledgeBaseId,
          chunk: r.chunkIndex,
          score: Math.min(Math.max(r.similarity, 0), 1),
          content: r.content,
        }
      })
      .filter((r): r is SearchResult => r !== null)

    return R.ok({
      success: true,
      results: searchResults,
      count: searchResults.length,
    })
  } catch (error) {
    console.error('[/api/search] Error:', error)

    if (error instanceof SyntaxError) {
      return Err.invalid('请求体格式错误')
    }

    return Err.internal('搜索失败，请稍后重试')
  }
}
