import { searchChunks as searchEsChunks } from '@/lib/elasticsearch'

// 调用智谱AI Embedding API，获取文本向量
export async function embedText(text: string, apiKey?: string | null): Promise<number[]> {
  const key = apiKey?.trim() || process.env.ZHIPU_API_KEY
  if (!key) {
    throw new Error('Missing ZHIPU_API_KEY environment variable')
  }

  const requestBody = {
    model: 'embedding-3',
    input: text,
    encoding_format: 'float',
  }
  console.log(`[EMBED] Calling Zhipu embed: textLen=${text.length}, trimLen=${text.trim().length}, first80=${JSON.stringify(text.slice(0, 80))}`)
  console.log(`[EMBED] Request body: ${JSON.stringify(requestBody).slice(0, 300)}`)

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`[EMBED] API error ${response.status}: ${error}`)
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

// 使用 Elasticsearch 向量相似度检索文档 chunks
export async function searchVectors(props: {
  embedding: number[]
  kbId: string
  topK?: number
}): Promise<SearchResult[]> {
  const { embedding, kbId, topK = 5 } = props

  const results = await searchEsChunks({
    embedding,
    kbId,
    topK,
  })

  return results.map((r) => ({
    id: r.id,
    content: r.content,
    fileName: r.fileName,
    chunkIndex: r.chunkIndex,
    similarity: r.similarity,
  }))
}
