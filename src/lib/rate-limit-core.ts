import { randomUUID } from 'node:crypto'

export type RateLimitEvalClient = {
  eval: (
    script: string,
    numKeys: number,
    key: string,
    windowMs: number,
    max: number,
    requestId: string
  ) => Promise<unknown>
}

export const slidingWindowRateLimitScript = `
  local key = KEYS[1]
  local window_ms = tonumber(ARGV[1])
  local max_requests = tonumber(ARGV[2])
  local request_id = ARGV[3]

  local time = redis.call('TIME')
  local now_ms = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
  local window_start = now_ms - window_ms

  redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

  local current = redis.call('ZCARD', key)
  if current >= max_requests then
    redis.call('PEXPIRE', key, window_ms)
    return { 0, current }
  end

  redis.call('ZADD', key, now_ms, request_id)
  redis.call('PEXPIRE', key, window_ms)

  return { 1, current + 1 }
`

/**
 * 基于 Redis 有序集合的滑动窗口限流。
 * 使用 Redis 服务器时间保证窗口判断一致，拒绝请求不再继续写入窗口。
 */
export async function rateLimitWithClient(
  client: RateLimitEvalClient,
  key: string,
  max: number,
  windowSeconds: number
): Promise<{ ok: boolean; remaining: number }> {
  const windowMs = windowSeconds * 1000
  const [allowed, count] = await client.eval(
    slidingWindowRateLimitScript,
    1,
    key,
    windowMs,
    max,
    randomUUID()
  ) as [number, number]

  return {
    ok: allowed === 1,
    remaining: Math.max(0, max - count),
  }
}
