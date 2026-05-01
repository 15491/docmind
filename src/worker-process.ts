// 独立 Worker 进程入口 — 生产环境与 Web 进程分离部署
// 启动方式: npm run worker

import { startWorker, stopWorker } from '@/lib/worker'

async function main() {
  await startWorker()
  console.log('[Worker] Process ready')

  const shutdown = async (signal: string) => {
    console.log(`[Worker] Received ${signal}, shutting down…`)
    await stopWorker()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('[Worker] Startup failed:', err)
  process.exit(1)
})
