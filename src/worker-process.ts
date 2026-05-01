// 独立 Worker 进程入口 — 生产环境与 Web 进程分离部署
// 启动方式: npm run worker

import { join } from 'path'
import { startWorker, stopWorker } from '@/lib/worker'

async function main() {
  // 设置临时目录环境变量（如果未设置）
  if (!process.env.TEMP_DIR) {
    process.env.TEMP_DIR = join(process.cwd(), '.temp')
    console.log(`[Worker] Set TEMP_DIR to: ${process.env.TEMP_DIR}`)
  }

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
