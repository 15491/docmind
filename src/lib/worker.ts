import { Worker } from 'bullmq'
import { redis } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { processDocument } from '@/lib/rag/document-processor'
import type { DocumentJob } from '@/lib/queue'
import { downloadFile } from '@/lib/minio'

let worker: Worker<DocumentJob> | null = null

export async function startWorker() {
  // 避免重复启动
  if (worker) return

  worker = new Worker<DocumentJob>(
    'docmind-documents',
    async (job) => {
      console.log(`[Worker] Processing job ${job.id}:`, job.data.documentId)

      try {
        const objectKey = job.data.objectKey

        console.log(`[Worker] Downloading file from MinIO: ${objectKey}`)

        const [buffer, user] = await Promise.all([
          downloadFile(objectKey).catch((err) => {
            throw new Error(`Failed to download file from MinIO: ${err instanceof Error ? err.message : String(err)}`)
          }),
          prisma.user.findUnique({
            where: { id: job.data.userId },
            select: { zhipuApiKey: true, ragConfig: true },
          }),
        ])

        const ragConfig = (user?.ragConfig ?? {}) as { chunkSize?: number; overlap?: number }

        const result = await processDocument({
          buffer,
          mimeType: job.data.mimeType,
          fileName: job.data.fileName,
          documentId: job.data.documentId,
          knowledgeBaseId: job.data.knowledgeBaseId,
          userId: job.data.userId,
          apiKey: user?.zhipuApiKey,
          chunkSize: ragConfig.chunkSize,
          overlap: ragConfig.overlap,
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
      }
    },
    {
      connection: redis,
      concurrency: 3,
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
