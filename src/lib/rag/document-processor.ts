import { randomUUID } from 'crypto'
import pdf from 'pdf-parse'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import stripMarkdown from 'strip-markdown'
import { chunkText } from './chunk'
import { embedText } from './embeddings'
import { prisma } from '@/lib/prisma'

export interface ProcessDocumentProps {
  buffer: Buffer
  mimeType: string
  fileName: string
  documentId: string
  knowledgeBaseId: string
  apiKey?: string | null
}

export interface ProcessingResult {
  success: boolean
  chunkCount: number
  error?: string
}

// 解析不同格式的文档为纯文本
async function parseDocument(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/pdf') {
    const data = await pdf(buffer)
    return data.text
  }

  if (
    mimeType === 'text/markdown' ||
    mimeType === 'text/plain' ||
    mimeType.startsWith('text/')
  ) {
    let text = buffer.toString('utf-8')

    // Markdown 需要额外处理，去除 Markdown 语法
    if (mimeType === 'text/markdown') {
      const processor = unified()
        .use(remarkParse)
        .use(stripMarkdown)
      const ast = processor.parse(text)
      const result = processor.runSync(ast)
      text = result.value as string
    }

    return text
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}

// 完整文档处理流程：解析 → 分块 → 向量化 → 保存
export async function processDocument(
  props: ProcessDocumentProps
): Promise<ProcessingResult> {
  const {
    buffer,
    mimeType,
    fileName,
    documentId,
    knowledgeBaseId,
    apiKey,
  } = props

  try {
    // 1️⃣ 解析文档为纯文本
    const text = await parseDocument(buffer, mimeType)

    // 2️⃣ 文本分块（固定 token 数 + 重叠）
    const chunks = chunkText(text, 500, 50)

    // 3️⃣ 批量并发向量化并保存 chunks（每批 10 个，避免逐条串行）
    const BATCH_SIZE = 10
    let successCount = 0

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (chunk, j) => {
          const embedding = await embedText(chunk.text, apiKey)
          const vectorString = `[${embedding.join(',')}]`
          await prisma.$executeRaw`
            INSERT INTO "DocumentChunk" (id, content, "chunkIndex", "documentId", embedding)
            VALUES (${randomUUID()}, ${chunk.text}, ${i + j}, ${documentId}, ${vectorString}::vector(2048))
          `
        })
      )
      successCount += results.filter((r) => r.status === 'fulfilled').length
      results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .forEach((r, j) => console.error(`Failed to embed chunk ${i + j}:`, r.reason))
    }

    // 4️⃣ 更新文档状态
    if (successCount === chunks.length) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'ready' },
      })
    } else if (successCount > 0) {
      // 部分 chunk 向量化失败，整体标记为失败以便重试
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'failed' },
      })
      throw new Error(`Only ${successCount}/${chunks.length} chunks were successfully embedded`)
    } else {
      // 全部失败
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'failed' },
      })
      throw new Error('No chunks were successfully embedded')
    }

    return {
      success: true,
      chunkCount: successCount,
    }
  } catch (error) {
    // 标记文档处理失败
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'failed' },
    }).catch(() => {
      // 忽略更新失败的错误
    })

    return {
      success: false,
      chunkCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
