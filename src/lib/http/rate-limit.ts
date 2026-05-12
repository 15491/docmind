import { rateLimitRedis } from '@/lib/infra/redis'
import { rateLimitWithClient } from './rate-limit-core'

/**
 * 基于 Redis 的滑动窗口限流。
 * 使用独立 Redis 连接，快速失败，不做重试。
 * @returns `ok=false` 时应返回 429
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<{ ok: boolean; remaining: number }> {
  return rateLimitWithClient(rateLimitRedis, key, max, windowSeconds)
}
