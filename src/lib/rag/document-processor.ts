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
  } = props

  try {
    // 1️⃣ 解析文档为纯文本
    const text = await parseDocument(buffer, mimeType)

    // 2️⃣ 文本分块（固定 token 数 + 重叠）
    const chunks = chunkText(text, 500, 50)

    // 3️⃣ 批量向量化并保存 chunks
    let successCount = 0
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      try {
        // 调用 Zhipu AI Embedding API
        const embedding = await embedText(chunk.text)

        // 使用原生 SQL 保存到 DocumentChunk 表（Prisma 不能直接处理 pgvector）
        const vectorString = `[${embedding.join(',')}]`
        await prisma.$executeRaw`
          INSERT INTO "DocumentChunk" (id, content, "chunkIndex", "documentId", embedding)
          VALUES (${randomUUID()}, ${chunk.text}, ${i}, ${documentId}, ${vectorString}::vector(2048))
        `

        successCount++
      } catch (error) {
        console.error(`Failed to embed chunk ${i}:`, error)
        // 继续处理下一个 chunk，不中断流程
      }
    }

    // 4️⃣ 更新文档状态
    if (successCount === chunks.length) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'ready' },
      })
    } else if (successCount > 0) {
      // 部分成功，标记为 partial
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'ready' },
      })
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
