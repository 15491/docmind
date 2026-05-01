import { Worker } from 'bullmq'
import { readFile, unlink } from 'fs/promises'
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
        const [buffer, user] = await Promise.all([
          readFile(job.data.filePath),
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
        console.error(`[Worker] Job ${job.id} error:`, error)
        throw error
      } finally {
        // 无论成功或失败，都清理临时文件
        await unlink(job.data.filePath).catch(() => {})
      }
    },
    {
      connection: redis,
      concurrency: 3, // 同时处理 3 个任务
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
