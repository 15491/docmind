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
    attempts: 5, // 最多重试 5 次（考虑到临时文件可能延迟）
    backoff: {
      type: 'exponential',
      delay: 3000, // 初始延迟 3 秒
      multiplier: 1.5, // 每次延迟增加 1.5 倍
    },
    removeOnComplete: true,
    removeOnFail: { count: 100 }, // 保留最近 100 条失败记录供排查
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
