export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { ensureBucket } = await import('@/lib/minio')
      await ensureBucket()
      console.log('[Instrumentation] MinIO bucket initialized')
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize MinIO:', error)
    }

    try {
      const { ensureIndex } = await import('@/lib/elasticsearch')
      await ensureIndex()
      console.log('[Instrumentation] Elasticsearch index initialized')
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize Elasticsearch:', error)
    }
  }
}
