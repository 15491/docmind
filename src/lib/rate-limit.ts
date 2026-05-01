import { redis } from './redis'

/**
 * 基于 Redis 的滑动窗口限流（原子操作）。
 * @returns ok=false 时应返回 429
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<{ ok: boolean; remaining: number }> {
  const script = `
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    return count
  `

  const count = await redis.eval(script, 1, key, windowSeconds) as number
  return { ok: count <= max, remaining: Math.max(0, max - count) }
}
