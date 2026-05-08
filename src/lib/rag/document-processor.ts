import { randomUUID } from 'crypto'
import { unified, type Plugin } from 'unified'
import remarkParse from 'remark-parse'
import stripMarkdown from 'strip-markdown'
import { chunkText } from './chunk'
import { embedText } from './embeddings'
import { purgeDocumentDerivedData } from '@/lib/document-cleanup'
import { indexChunks } from '@/lib/elasticsearch'
import { prisma } from '@/lib/prisma'

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

type MarkdownNode = {
  type: string
  value?: string
  children?: MarkdownNode[]
}

const stripMarkdownPlugin = stripMarkdown as unknown as Plugin

function hasChildren(node: MarkdownNode): node is MarkdownNode & { children: MarkdownNode[] } {
  return 'children' in node && Array.isArray(node.children)
}

function hasValue(node: MarkdownNode): node is MarkdownNode & { value: string } {
  return 'value' in node && typeof node.value === 'string'
}

function markdownTreeToText(node: MarkdownNode): string {
  if (hasValue(node)) {
    return node.value
  }

  if (!hasChildren(node)) {
    return ''
  }

  const content = node.children.map(markdownTreeToText).join('')
  return node.type === 'paragraph' ? `${content}\n\n` : content
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const { readFile } = await import('fs/promises')
  const { join } = await import('path')
  const { pathToFileURL } = await import('url')

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as typeof import('pdfjs-dist/types/src/pdf')

  const workerPath = join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href

  const cmapsDir = join(process.cwd(), 'node_modules', 'pdfjs-dist', 'cmaps')
  const fontsDir = join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts')

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

async function parseDocument(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/pdf') {
    return parsePdf(buffer)
  }

  if (
    mimeType === 'text/markdown'
    || mimeType === 'text/plain'
    || mimeType.startsWith('text/')
  ) {
    let text = buffer.toString('utf-8')

    if (mimeType === 'text/markdown') {
      const processor = unified()
        .use(remarkParse)
        .use(stripMarkdownPlugin)
      const ast = processor.parse(text)
      const result = processor.runSync(ast) as unknown as MarkdownNode
      text = markdownTreeToText(result).trim()
    }

    return text
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}

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
    const text = await parseDocument(buffer, mimeType)
    console.log(`[DOC-PROCESSOR] Parsed text length: ${text.length}, trimmed: ${text.trim().length}`)
    console.log(`[DOC-PROCESSOR] Text preview (first 200 chars): ${JSON.stringify(text.slice(0, 200))}`)
    if (!text.trim()) {
      throw new Error('Document contains no extractable text')
    }

    const rawChunks = chunkText(text, chunkSize, overlap)
    const chunks = rawChunks.filter((chunk) => chunk.text.trim().length > 0)
    console.log(`[DOC-PROCESSOR] Chunks: ${rawChunks.length} raw -> ${chunks.length} after empty-filter`)
    chunks.slice(0, 3).forEach((chunk, index) => {
      console.log(
        `[DOC-PROCESSOR] Chunk[${index}] len=${chunk.text.length} trimLen=${chunk.text.trim().length} preview=${JSON.stringify(chunk.text.slice(0, 80))}`
      )
    })

    if (chunks.length === 0) {
      throw new Error('Document contains no indexable text chunks')
    }

    const BATCH_SIZE = 10
    let successCount = 0

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (chunk, offset) => {
          console.log(
            `[DOC-PROCESSOR] Embedding chunk ${i + offset}: len=${chunk.text.length}, trimLen=${chunk.text.trim().length}`
          )
          const embedding = await embedText(chunk.text, apiKey)
          const chunkIndex = i + offset
          const chunkId = randomUUID()

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

      const failures = results.flatMap((result, offset) => (
        result.status === 'rejected'
          ? [{ chunkIndex: i + offset, reason: result.reason }]
          : []
      ))

      failures.forEach((failure) => {
        console.error(`Failed to process chunk ${failure.chunkIndex}:`, failure.reason)
      })

      if (failures.length > 0) {
        throw new Error(
          `Failed to process ${failures.length} chunk(s): ${failures
            .map((failure) => `#${failure.chunkIndex}`)
            .join(', ')}`
        )
      }

      successCount += batch.length
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'ready' },
    })

    return {
      success: true,
      chunkCount: successCount,
    }
  } catch (error) {
    await purgeDocumentDerivedData(documentId).catch((cleanupError) => {
      console.error(
        '[DOC-PROCESSOR] Failed to purge partial chunks:',
        cleanupError instanceof Error ? cleanupError.message : cleanupError
      )
    })

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'failed' },
    }).catch(() => {})

    return {
      success: false,
      chunkCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
