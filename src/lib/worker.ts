import { Worker } from 'bullmq'
import { readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { redis } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { processDocument } from '@/lib/rag/document-processor'
import type { DocumentJob } from '@/lib/queue'

let worker: Worker<DocumentJob> | null = null

export async function startWorker() {
  // 避免重复启动
  if (worker) return

  worker = new Worker<DocumentJob>(
    'docmind-documents',
    async (job) => {
      console.log(`[Worker] Processing job ${job.id}:`, job.data.documentId)

      try {
        // 检查文件是否存在
        if (!existsSync(job.data.filePath)) {
          throw new Error(
            `File not found: ${job.data.filePath}. Job attempt: ${job.attemptsMade + 1}/${job.opts.attempts}`
          )
        }

        const [buffer, user] = await Promise.all([
          readFile(job.data.filePath).catch((err) => {
            throw new Error(`Failed to read file: ${err.message}`)
          }),
          prisma.user.findUnique({
            where: { id: job.data.userId },
            select: { zhipuApiKey: true },
          }),
        ])

        const result = await processDocument({
          buffer,
          mimeType: job.data.mimeType,
          fileName: job.data.fileName,
          documentId: job.data.documentId,
          knowledgeBaseId: job.data.knowledgeBaseId,
          apiKey: user?.zhipuApiKey,
        })

        if (!result.success) {
          throw new Error(result.error || 'Document processing failed')
        }

        console.log(
          `[Worker] Successfully processed ${result.chunkCount} chunks for document ${job.data.documentId}`
        )

        return result
      } catch (error) {
        console.error(
          `[Worker] Job ${job.id} error (attempt ${job.attemptsMade + 1}):`,
          error instanceof Error ? error.message : error
        )
        throw error
      } finally {
        // 清理临时文件（即使重试也会在最后清理）
        if (job.progress === 100 || job.attemptsMade >= (job.opts.attempts ?? 1)) {
          await unlink(job.data.filePath).catch(() => {
            console.warn(`[Worker] Failed to clean up temp file: ${job.data.filePath}`)
          })
        }
      }
    },
    {
      connection: redis,
      concurrency: 3,
      settings: {
        maxStalledCount: 2, // 最多允许 2 次卡顿
        stalledInterval: 5000, // 每 5 秒检查一次卡顿的任务
        retryProcessDelay: 5000, // 重试前等待 5 秒
      },
    }
  )

  worker.on('ready', () => {
    console.log('[Worker] ready')
  })

  worker.on('active', (job) => {
    console.log(`[Worker] Job ${job.id} active`)
  })

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message)
  })

  worker.on('error', (err) => {
    console.error('[Worker] Error:', err)
  })
}

export async function stopWorker() {
  if (worker) {
    await worker.close()
    worker = null
    console.log('[Worker] stopped')
  }
}
