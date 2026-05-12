import { Err, R } from '@/lib/http/response'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/http/validate-request'
import { searchSchema } from '@/lib/http/validators'

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

interface SearchHit {
  id: string
  documentId: string
  fileName: string
  chunkIndex: number
  similarity: number
  content: string
}

interface SearchDocumentRecord {
  id: string
  knowledgeBaseId: string
  knowledgeBase: {
    name: string
  }
}

interface UserSearchContext {
  apiKey: string | null
  ragConfig: {
    topK: number
  }
}

export interface SearchRouteDeps {
  rateLimit: (key: string, maxRequests: number, windowSeconds: number) => Promise<{ ok: boolean }>
  getUserContext: (userId: string) => Promise<UserSearchContext>
  embedText: (text: string, apiKey?: string | null) => Promise<number[]>
  searchChunks: (input: { embedding: number[]; userId: string; topK: number }) => Promise<SearchHit[]>
  findReadyDocuments: (documentIds: string[]) => Promise<SearchDocumentRecord[]>
}

export async function handleSearchRequest(
  req: Request,
  userId: string,
  deps: SearchRouteDeps
): Promise<Response> {
  try {
    const { ok } = await deps.rateLimit(`rl:search:${userId}`, 30, 60)
    if (!ok) return Err.tooMany('搜索过于频繁，请稍后再试')

    const body = await parseJsonBody(req, searchSchema)
    if (isValidationErrorResponse(body)) return body

    const { query, topK: rawTopK } = body
    const { apiKey: userApiKey, ragConfig } = await deps.getUserContext(userId)
    const topK = rawTopK ?? Math.min(ragConfig.topK, 50)
    const queryEmbedding = await deps.embedText(query, userApiKey)

    const esResults = await deps.searchChunks({ embedding: queryEmbedding, userId, topK })
    const documentIds = [...new Set(esResults.map((item) => item.documentId))]
    const documents = await deps.findReadyDocuments(documentIds)

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
}
