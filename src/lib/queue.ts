import { Queue } from 'bullmq'
import { getDocumentJobId } from './document-job-id'
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

const DOCUMENT_CANCEL_PREFIX = 'docmind:document-cancel:'
const DOCUMENT_CANCEL_TTL_SECONDS = 24 * 60 * 60

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

function getDocumentCancellationKey(documentId: string): string {
  return `${DOCUMENT_CANCEL_PREFIX}${documentId}`
}

export async function markDocumentCancellationRequested(documentId: string) {
  await redis.set(getDocumentCancellationKey(documentId), '1', 'EX', DOCUMENT_CANCEL_TTL_SECONDS)
}

export async function clearDocumentCancellationRequested(documentId: string) {
  await redis.del(getDocumentCancellationKey(documentId))
}

export async function clearDocumentCancellationRequests(documentIds: string[]) {
  await Promise.all(documentIds.map((documentId) => clearDocumentCancellationRequested(documentId)))
}

export async function isDocumentCancellationRequested(documentId: string): Promise<boolean> {
  return (await redis.exists(getDocumentCancellationKey(documentId))) === 1
}

export async function enqueueDocumentJob(data: DocumentJob) {
  await clearDocumentCancellationRequested(data.documentId)
  return documentQueue.add(
    'process-document',
    data,
    { jobId: getDocumentJobId(data.documentId) }
  )
}

export async function cancelDocumentProcessingJob(documentId: string): Promise<'removed' | 'locked' | 'missing'> {
  await markDocumentCancellationRequested(documentId)

  const removed = await documentQueue.remove(getDocumentJobId(documentId), { removeChildren: true })
  if (removed === 1) {
    return 'removed'
  }

  const existingJob = await documentQueue.getJob(getDocumentJobId(documentId))
  return existingJob ? 'locked' : 'missing'
}

export async function cancelDocumentProcessingJobs(documentIds: string[]) {
  return Promise.all(documentIds.map(async (documentId) => ({
    documentId,
    status: await cancelDocumentProcessingJob(documentId),
  })))
}
