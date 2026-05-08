import { prisma } from '@/lib/prisma'
import { searchChunks } from '@/lib/elasticsearch'
import { getUserContext } from '@/lib/get-api-key'
import { rateLimit } from '@/lib/rate-limit'
import { embedText } from '@/lib/rag/embeddings'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/validate-request'
import { searchSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

interface SearchResult {
  id: string
  docId: string
  docName: string
  kbName: string
  kbId: string
  chunk: number
  score: number
  content: string
}

export const POST = withAuth(async (req, _ctx, userId) => {
  try {
    const { ok } = await rateLimit(`rl:search:${userId}`, 30, 60)
    if (!ok) return Err.tooMany('搜索过于频繁，请稍后再试')

    const body = await parseJsonBody(req, searchSchema)
    if (isValidationErrorResponse(body)) return body

    const { query, topK: rawTopK } = body
    const { apiKey: userApiKey, ragConfig } = await getUserContext(userId)
    const topK = rawTopK ?? Math.min(ragConfig.topK, 50)
    const queryEmbedding = await embedText(query, userApiKey)

    const esResults = await searchChunks({ embedding: queryEmbedding, userId, topK })
    const documentIds = [...new Set(esResults.map((item) => item.documentId))]
    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds }, status: 'ready' },
      select: {
        id: true,
        fileName: true,
        knowledgeBaseId: true,
        knowledgeBase: { select: { name: true } },
      },
    })

    const docMap = new Map(documents.map((document) => [document.id, document]))
    const results: SearchResult[] = esResults
      .map((item) => {
        const doc = docMap.get(item.documentId)
        if (!doc) return null

        return {
          id: item.id,
          docId: doc.id,
          docName: item.fileName,
          kbName: doc.knowledgeBase.name,
          kbId: doc.knowledgeBaseId,
          chunk: item.chunkIndex,
          score: Math.min(Math.max(item.similarity, 0), 1),
          content: item.content,
        }
      })
      .filter((item): item is SearchResult => item !== null)

    return R.ok({ success: true, results, count: results.length })
  } catch (error) {
    console.error('[/api/search] Error:', error)
    return Err.internal('搜索失败，请稍后重试')
  }
})
