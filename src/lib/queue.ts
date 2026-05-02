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
  objectKey: string // MinIO 对象存储路径
  ragConfig?: RagConfig
}

// 初始化文档处理队列
export const documentQueue = new Queue<DocumentJob>('docmind-documents', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5, // 最多重试 5 次（考虑到临时文件可能延迟）
    backoff: {
      type: 'exponential',
      delay: 3000, // 初始延迟 3 秒
    },
    removeOnComplete: true,
    removeOnFail: { count: 100 }, // 保留最近 100 条失败记录供排查
  },
})

// 监听队列事件
;(documentQueue as any).on('completed', (job: any) => {
  console.log(`[Queue] Job ${job.id} completed`, job.data.documentId)
})

;(documentQueue as any).on('failed', (job: any, err: any) => {
  console.error(`[Queue] Job ${job?.id} failed:`, err.message)
})

;(documentQueue as any).on('error', (error: any) => {
  console.error('[Queue] Error:', error)
})
