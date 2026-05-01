import { prisma } from '@/lib/prisma'

// 调用智谱AI Embedding API，获取文本向量
export async function embedText(text: string, apiKey?: string | null): Promise<number[]> {
  const key = apiKey?.trim() || process.env.ZHIPU_API_KEY
  if (!key) {
    throw new Error('Missing ZHIPU_API_KEY environment variable')
  }

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'embedding-3',
      input: text,
      encoding_format: 'float',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Zhipu AI Embedding API error: ${response.status} ${error}`)
  }

  const data = await response.json() as {
    data: Array<{ embedding: number[] }>;
    error?: { message: string };
  }

  if (data.error) {
    throw new Error(`Zhipu AI error: ${data.error.message}`)
  }

  if (!data.data || !data.data[0] || !data.data[0].embedding) {
    throw new Error('Invalid response from Zhipu AI Embedding API')
  }

  return data.data[0].embedding
}

interface SearchResult {
  id: string
  content: string
  fileName: string
  chunkIndex: number
  similarity: number
}

// 使用 pgvector 向量相似度检索文档 chunks
export async function searchVectors(props: {
  embedding: number[]
  kbId: string
  topK?: number
}): Promise<SearchResult[]> {
  const { embedding, kbId, topK = 5 } = props

  // 将向量转换为 pgvector 格式字符串 [0.1, 0.2, ...]
  const vectorString = `[${embedding.join(',')}]`

  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
      dc.id,
      dc.content,
      d."fileName",
      dc."chunkIndex",
      (1 - (dc.embedding <=> ${vectorString}::vector)) AS similarity
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE d."knowledgeBaseId" = ${kbId} AND d.status = 'ready'
    ORDER BY dc.embedding <=> ${vectorString}::vector ASC
    LIMIT ${topK}
  `

  return results
}
