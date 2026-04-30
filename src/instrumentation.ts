// Next.js Instrumentation API — 在应用启动时执行
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // 仅在 nodejs runtime 启动 Worker
  // Edge runtime 不支持长时间运行的后台进程
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorker } = await import('@/lib/worker')
    try {
      await startWorker()
    } catch (error) {
      console.error('[Instrumentation] Failed to start worker:', error)
    }
  }
}
