import { Worker } from 'bullmq'
import { redis } from '@/lib/redis'
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
        // base64 字符串解码为 Buffer
        const buffer = Buffer.from(job.data.buffer, 'base64')

        // 调用文档处理器
        const result = await processDocument({
          buffer,
          mimeType: job.data.mimeType,
          fileName: job.data.fileName,
          documentId: job.data.documentId,
          knowledgeBaseId: job.data.knowledgeBaseId,
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
