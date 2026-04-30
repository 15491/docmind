import { Queue } from 'bullmq'
import { redis } from '@/lib/redis'

export interface DocumentJob {
  documentId: string
  knowledgeBaseId: string
  fileName: string
  mimeType: string
  buffer: string // base64 编码的文件内容
}

// 初始化文档处理队列
export const documentQueue = new Queue<DocumentJob>('docmind-documents', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3, // 最多重试 3 次
    backoff: {
      type: 'exponential',
      delay: 2000, // 初始延迟 2 秒
    },
    removeOnComplete: true, // 完成后删除任务
  },
})

// 监听队列事件
documentQueue.on('completed', (job) => {
  console.log(`[Queue] Job ${job.id} completed`, job.data.documentId)
})

documentQueue.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job?.id} failed:`, err.message)
})

documentQueue.on('error', (error) => {
  console.error('[Queue] Error:', error)
})
