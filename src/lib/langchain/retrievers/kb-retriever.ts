import { Document } from '@langchain/core/documents'
import { BaseRetriever } from '@langchain/core/retrievers'
import { embedText, searchVectors, type VectorSearchResult } from '@/lib/rag/embeddings'

export interface KbRetrieverInput {
  kbId: string
  apiKey?: string | null
  topK?: number
}

export interface KbDocumentMetadata {
  fileName: string
  chunkIndex: number
  similarity: number
}

export class KnowledgeBaseRetriever extends BaseRetriever<KbDocumentMetadata> {
  lc_namespace = ['docmind', 'retrievers']

  private readonly kbId: string
  private readonly apiKey?: string | null
  private readonly topK: number

  constructor(fields: KbRetrieverInput) {
    super()
    this.kbId = fields.kbId
    this.apiKey = fields.apiKey
    this.topK = fields.topK ?? 5
  }

  async _getRelevantDocuments(query: string) {
    const embedding = await embedText(query, this.apiKey)
    const results = await searchVectors({
      embedding,
      kbId: this.kbId,
      topK: this.topK,
    })

    return results.map((result) => toLangChainDocument(result))
  }
}

export function toLangChainDocument(result: VectorSearchResult) {
  return new Document<KbDocumentMetadata>({
    id: result.id,
    pageContent: result.content,
    metadata: {
      fileName: result.fileName,
      chunkIndex: result.chunkIndex,
      similarity: result.similarity,
    },
  })
}
