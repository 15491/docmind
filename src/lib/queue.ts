import { Queue } from 'bullmq'
import { redis } from '@/lib/redis'

export interface DocumentJob {
  documentId: string
  knowledgeBaseId: string
  userId: string
  fileName: string
  mimeType: string
  filePath: string // 临时文件路径，worker 处理后自动删除
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
    removeOnComplete: true,
    removeOnFail: { count: 100 }, // 保留最近 100 条失败记录供排查，防止无限堆积
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
