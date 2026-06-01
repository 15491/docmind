export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { ensureBucket } = await import('@/lib/infra/minio')
      await ensureBucket()
      console.log('[Instrumentation] MinIO bucket initialized')
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize MinIO:', error)
    }

    try {
      const { ensureIndex } = await import('@/lib/infra/elasticsearch')
      await ensureIndex()
      console.log('[Instrumentation] Elasticsearch index initialized')
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize Elasticsearch:', error)
    }

    try {
      const { startWorker } = await import('@/lib/infra/worker')
      await startWorker()
      console.log('[Instrumentation] Worker started')
    } catch (error) {
      console.error('[Instrumentation] Failed to start worker:', error)
    }
  }
}
