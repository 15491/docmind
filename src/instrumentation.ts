// Next.js Instrumentation API — 在应用启动时执行
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import { join } from 'path'

export async function register() {
  // 设置临时文件目录环境变量（如果未设置）
  if (!process.env.TEMP_DIR && process.env.NEXT_RUNTIME === 'nodejs') {
    process.env.TEMP_DIR = join(process.cwd(), '.temp')
    console.log(`[Instrumentation] Set TEMP_DIR to: ${process.env.TEMP_DIR}`)
  }

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
