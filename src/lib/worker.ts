import { Worker } from 'bullmq'
import {
  assertDocumentJobCanContinue,
  isDocumentJobAbortedError,
} from '@/lib/document-job-guard'
import { getUserContext } from '@/lib/get-api-key'
import { downloadFile } from '@/lib/minio'
import type { DocumentJob } from '@/lib/queue'
import { redis } from '@/lib/redis'
import { processDocument } from '@/lib/rag/document-processor'

let worker: Worker<DocumentJob> | null = null

export async function startWorker() {
  if (worker) return

  worker = new Worker<DocumentJob>(
    'docmind-documents',
    async (job) => {
      console.log(`[Worker] Processing job ${job.id}:`, job.data.documentId)

      try {
        const objectKey = job.data.objectKey

        await assertDocumentJobCanContinue(job.data.documentId, objectKey)
        console.log(`[Worker] Downloading file from MinIO: ${objectKey}`)

        const [buffer, user] = await Promise.all([
          downloadFile(objectKey).catch((err) => {
            throw new Error(`Failed to download file from MinIO: ${err instanceof Error ? err.message : String(err)}`)
          }),
          getUserContext(job.data.userId),
        ])

        await assertDocumentJobCanContinue(job.data.documentId, objectKey)
        const result = await processDocument({
          buffer,
          mimeType: job.data.mimeType,
          fileName: job.data.fileName,
          documentId: job.data.documentId,
          knowledgeBaseId: job.data.knowledgeBaseId,
          userId: job.data.userId,
          storageKey: objectKey,
          apiKey: user.apiKey,
          chunkSize: user.ragConfig.chunkSize,
          overlap: user.ragConfig.overlap,
        })

        if (!result.success) {
          if (result.aborted) {
            console.log(`[Worker] Job ${job.id} skipped: ${result.error ?? 'aborted'}`)
            return result
          }

          throw new Error(result.error || 'Document processing failed')
        }

        console.log(
          `[Worker] Successfully processed ${result.chunkCount} chunks for document ${job.data.documentId}`
        )

        return result
      } catch (error) {
        if (isDocumentJobAbortedError(error)) {
          console.log(`[Worker] Job ${job.id} skipped: ${error.message}`)
          return { success: false, aborted: true, chunkCount: 0, error: error.message }
        }

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
