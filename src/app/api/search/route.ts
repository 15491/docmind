import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { embedText } from '@/lib/rag/embeddings'
import { rateLimit } from '@/lib/rate-limit'
import { getUserApiKey } from '@/lib/get-api-key'

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
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { ok } = await rateLimit(`rl:search:${session.user.id}`, 30, 60)
    if (!ok) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: '搜索过于频繁，请稍后再试' },
        { status: 429 }
      )
    }

    const body = await req.json() as SearchRequest
    const { query, topK = 10 } = body

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '搜索关键词不能为空' },
        { status: 400 }
      )
    }

    // 获取用户的 API Key
    const userApiKey = await getUserApiKey(session.user.id)

    // 获取查询的向量表示
    const queryEmbedding = await embedText(query.trim(), userApiKey)
    const vectorString = `[${queryEmbedding.join(',')}]`

    // 跨知识库向量搜索
    const results = await prisma.$queryRaw<Array<{
      id: string
      content: string
      chunkIndex: number
      documentId: string
      fileName: string
      kbId: string
      kbName: string
      similarity: number
    }>>`
      SELECT
        dc.id,
        dc.content,
        dc."chunkIndex",
        dc."documentId",
        d."fileName",
        d."knowledgeBaseId" as "kbId",
        kb.name as "kbName",
        1 - (dc.embedding <=> ${vectorString}::vector) AS similarity
      FROM "DocumentChunk" dc
      JOIN "Document" d ON d.id = dc."documentId"
      JOIN "KnowledgeBase" kb ON kb.id = d."knowledgeBaseId"
      WHERE kb."userId" = ${session.user.id}
        AND d.status = 'ready'
      ORDER BY dc.embedding <=> ${vectorString}::vector ASC
      LIMIT ${topK}
    `

    const searchResults: SearchResult[] = results.map(r => ({
      id: r.id,
      docName: r.fileName,
      kbName: r.kbName,
      kbId: r.kbId,
      chunk: r.chunkIndex,
      score: Math.min(Math.max(r.similarity, 0), 1),
      content: r.content,
    }))

    return NextResponse.json({
      success: true,
      results: searchResults,
      count: searchResults.length,
    })
  } catch (error) {
    console.error('[/api/search] Error:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '请求体格式错误' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '搜索失败，请稍后重试' },
      { status: 500 }
    )
  }
}
