import { Client } from '@elastic/elasticsearch'
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types'

const esClient = new Client({
  node: process.env.ELASTICSEARCH_HOST || 'http://localhost:9200',
})

const INDEX_NAME = 'docmind-chunks'

export interface ChunkDoc {
  id: string
  content: string
  chunkIndex: number
  documentId: string
  kbId: string
  userId: string
  fileName: string
  embedding: number[]
}

export interface SearchResult {
  id: string
  content: string
  chunkIndex: number
  documentId: string
  fileName: string
  similarity: number
}

export async function ensureIndex() {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME })

    if (!exists) {
      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            id:          { type: 'keyword' },
            content:     { type: 'text' },
            chunkIndex:  { type: 'integer' },
            documentId:  { type: 'keyword' },
            kbId:        { type: 'keyword' },
            userId:      { type: 'keyword' },
            fileName:    { type: 'keyword' },
            embedding: {
              type:       'dense_vector',
              dims:       2048,
              index:      true,
              similarity: 'cosine',
            },
          },
        },
      })
      console.log(`[Elasticsearch] Created index: ${INDEX_NAME}`)
    }
  } catch (error) {
    console.error('[Elasticsearch] Index creation failed:', error)
    throw error
  }
}

export async function indexChunks(chunks: ChunkDoc[]) {
  if (chunks.length === 0) return

  try {
    const result = await esClient.bulk({
      operations: chunks.flatMap((chunk) => [
        { index: { _index: INDEX_NAME, _id: chunk.id } },
        chunk,
      ]),
    })

    if (result.errors) {
      const errors = result.items
        .filter((item) => item.index?.error)
        .map((item) => item.index?.error)
      console.error('[Elasticsearch] Bulk indexing had errors:', errors)
      throw new Error(`Bulk indexing failed: ${errors.length} errors`)
    }

    console.log(`[Elasticsearch] Indexed ${chunks.length} chunks`)
  } catch (error) {
    console.error('[Elasticsearch] Bulk indexing failed:', error)
    throw error
  }
}

export async function searchChunks({
  embedding,
  kbId,
  userId,
  topK = 10,
}: {
  embedding: number[]
  kbId?: string
  userId?: string
  topK?: number
}): Promise<SearchResult[]> {
  try {
    const filters: QueryDslQueryContainer[] = []
    if (kbId)   filters.push({ term: { kbId } })
    if (userId) filters.push({ term: { userId } })

    const response = await esClient.search<ChunkDoc>({
      index: INDEX_NAME,
      knn: {
        field:         'embedding',
        query_vector:  embedding,
        k:             topK,
        num_candidates: topK * 2,
        ...(filters.length > 0 && { filter: { bool: { filter: filters } } }),
      },
      size: topK,
      _source: ['id', 'content', 'chunkIndex', 'documentId', 'fileName'],
    })

    return response.hits.hits.map((hit) => ({
      id:          hit._id ?? '',
      content:     hit._source?.content     ?? '',
      chunkIndex:  hit._source?.chunkIndex  ?? 0,
      documentId:  hit._source?.documentId  ?? '',
      fileName:    hit._source?.fileName    ?? '',
      similarity:  hit._score              ?? 0,
    }))
  } catch (error) {
    console.error('[Elasticsearch] Search failed:', error)
    throw error
  }
}

export async function deleteDocumentChunks(documentId: string) {
  try {
    await esClient.deleteByQuery({
      index: INDEX_NAME,
      query: { term: { documentId } },
    })
    console.log(`[Elasticsearch] Deleted chunks for document: ${documentId}`)
  } catch (error) {
    console.error('[Elasticsearch] Delete by query failed:', error)
    throw error
  }
}
