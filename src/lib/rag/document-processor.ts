import { randomUUID } from 'crypto'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import stripMarkdown from 'strip-markdown'
import { chunkText } from './chunk'
import { embedText } from './embeddings'
import { prisma } from '@/lib/prisma'
import { indexChunks } from '@/lib/elasticsearch'

export interface ProcessDocumentProps {
  buffer: Buffer
  mimeType: string
  fileName: string
  documentId: string
  knowledgeBaseId: string
  userId: string
  apiKey?: string | null
  chunkSize?: number
  overlap?: number
}

export interface ProcessingResult {
  success: boolean
  chunkCount: number
  error?: string
}

// 用 pdfjs-dist 解析 PDF，比 pdf-parse 更好地支持 CJK CID 字体
async function parsePdf(buffer: Buffer): Promise<string> {
  const { join } = await import('path')
  const { pathToFileURL } = await import('url')
  const { readFile } = await import('fs/promises')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs')

  // pdfjs-dist v5 在 Node.js 下必须指定真实 worker 文件
  const workerPath = join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href

  // pdfjs-dist v5 的 NodeBinaryDataFactory 把 cMapUrl 拼成 file:// 字符串后直接交给
  // fs.readFile —— 但 fs.readFile 只接受 URL 对象，不接受 file:// 字符串，必然 ENOENT。
  // 解决方案：传入自定义 BinaryDataFactory，用文件系统路径直接读 .bcmap / 字体文件。
  const cmapsDir = join(process.cwd(), 'node_modules', 'pdfjs-dist', 'cmaps')
  const fontsDir = join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts')
  // pdfjs 会校验 url 必须以 "/" 结尾，所以这里用一个标记字符串当占位 baseUrl，
  // 真正的解析在自定义 _fetch 里按 kind 决定从哪个目录读。
  const CustomBinaryDataFactory = class {
    cMapUrl: string
    standardFontDataUrl: string
    wasmUrl: string | null
    constructor(opts: { cMapUrl?: string; standardFontDataUrl?: string; wasmUrl?: string }) {
      this.cMapUrl = opts.cMapUrl ?? 'cmap:/'
      this.standardFontDataUrl = opts.standardFontDataUrl ?? 'font:/'
      this.wasmUrl = opts.wasmUrl ?? null
    }
    async fetch({ kind, filename }: { kind: string; filename: string }): Promise<Uint8Array> {
      if (kind === 'cMapUrl') {
        const data = await readFile(join(cmapsDir, filename))
        return new Uint8Array(data)
      }
      if (kind === 'standardFontDataUrl') {
        const data = await readFile(join(fontsDir, filename))
        return new Uint8Array(data)
      }
      throw new Error(`Unsupported binary data kind: ${kind}`)
    }
  }

  const data = new Uint8Array(buffer)
  const doc = await pdfjsLib.getDocument({
    data,
    cMapUrl: pathToFileURL(cmapsDir + '/').href,
    cMapPacked: true,
    standardFontDataUrl: pathToFileURL(fontsDir + '/').href,
    BinaryDataFactory: CustomBinaryDataFactory,
    useSystemFonts: true,
  }).promise
  console.log(`[DOC-PROCESSOR] PDF pages: ${doc.numPages}`)

  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = (content.items as Array<{ str?: string }>)
      .map((item) => item.str ?? '')
      .join('')
    pages.push(pageText)
  }

  return pages.join('\n')
}

// 解析不同格式的文档为纯文本
async function parseDocument(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/pdf') {
    return parsePdf(buffer)
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
        .use(stripMarkdown as any)
      const ast = processor.parse(text)
      const result = processor.runSync(ast) as any
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
    userId,
    apiKey,
    chunkSize = 500,
    overlap = 50,
  } = props

  try {
    // 1️⃣ 解析文档为纯文本
    const text = await parseDocument(buffer, mimeType)
    console.log(`[DOC-PROCESSOR] Parsed text length: ${text.length}, trimmed: ${text.trim().length}`)
    console.log(`[DOC-PROCESSOR] Text preview (first 200 chars): ${JSON.stringify(text.slice(0, 200))}`)
    if (!text.trim()) {
      throw new Error('Document contains no extractable text')
    }

    // 2️⃣ 文本分块（过滤空块，避免空字符串发送给 Embedding API）
    const rawChunks = chunkText(text, chunkSize, overlap)
    const chunks = rawChunks.filter((c) => c.text.trim().length > 0)
    console.log(`[DOC-PROCESSOR] Chunks: ${rawChunks.length} raw → ${chunks.length} after empty-filter`)
    chunks.slice(0, 3).forEach((c, i) =>
      console.log(`[DOC-PROCESSOR] Chunk[${i}] len=${c.text.length} trimLen=${c.text.trim().length} preview=${JSON.stringify(c.text.slice(0, 80))}`)
    )

    // 3️⃣ 批量并发向量化并索引到 Elasticsearch（每批 10 个，避免逐条串行）
    const BATCH_SIZE = 10
    let successCount = 0

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (chunk, j) => {
          console.log(`[DOC-PROCESSOR] Embedding chunk ${i + j}: len=${chunk.text.length}, trimLen=${chunk.text.trim().length}`)
          const embedding = await embedText(chunk.text, apiKey)
          const chunkIndex = i + j
          const chunkId = randomUUID()

          // 同时插入到 PostgreSQL（content cache）和 Elasticsearch（vector search）
          await Promise.all([
            prisma.documentChunk.create({
              data: {
                id: chunkId,
                content: chunk.text,
                chunkIndex,
                documentId,
              },
            }),
            indexChunks([
              {
                id: `${documentId}-${chunkIndex}`,
                content: chunk.text,
                chunkIndex,
                documentId,
                kbId: knowledgeBaseId,
                userId,
                fileName,
                embedding,
              },
            ]),
          ])
        })
      )
      successCount += results.filter((r) => r.status === 'fulfilled').length
      results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .forEach((r, j) => console.error(`Failed to process chunk ${i + j}:`, r.reason))
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
