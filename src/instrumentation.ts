// Next.js Instrumentation API — 在应用启动时执行
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // 仅在 nodejs runtime 执行
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 初始化 MinIO
    try {
      const { ensureBucket } = await import('@/lib/minio')
      await ensureBucket()
      console.log('[Instrumentation] MinIO bucket initialized')
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize MinIO:', error)
    }

    // 初始化 Elasticsearch
    try {
      const { ensureIndex } = await import('@/lib/elasticsearch')
      await ensureIndex()
      console.log('[Instrumentation] Elasticsearch index initialized')
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize Elasticsearch:', error)
    }

    // 启动 Worker
    try {
      const { startWorker } = await import('@/lib/worker')
      await startWorker()
      console.log('[Instrumentation] Worker started')
    } catch (error) {
      console.error('[Instrumentation] Failed to start worker:', error)
    }
  }
}
