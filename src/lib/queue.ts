import { Queue } from 'bullmq'
import { redis } from '@/lib/redis'

export interface RagConfig {
  chunkSize?: number
  overlap?: number
  topK?: number
  temperature?: number
}

export interface DocumentJob {
  documentId: string
  knowledgeBaseId: string
  userId: string
  fileName: string
  mimeType: string
  objectKey: string
  ragConfig?: RagConfig
}

export const documentQueue = new Queue<DocumentJob>('docmind-documents', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: true,
    removeOnFail: { count: 100 },
  },
})

documentQueue.on('error', (error: Error) => {
  console.error('[Queue] Error:', error)
})
