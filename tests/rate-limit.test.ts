import assert from 'node:assert/strict'
import test from 'node:test'
import { rateLimitWithClient, slidingWindowRateLimitScript, type RateLimitEvalClient } from '../src/lib/rate-limit-core.ts'

test('rateLimitWithClient 使用滑动窗口脚本并返回剩余额度', async () => {
  const calls: unknown[][] = []
  const client: RateLimitEvalClient = {
    async eval(...args) {
      calls.push(args)
      return [1, 2]
    },
  }

  const result = await rateLimitWithClient(client, 'rl:test', 5, 60)

  assert.deepEqual(result, { ok: true, remaining: 3 })
  assert.equal(calls.length, 1)

  const [script, numKeys, key, windowMs, max, requestId] = calls[0] ?? []
  assert.equal(script, slidingWindowRateLimitScript)
  assert.equal(numKeys, 1)
  assert.equal(key, 'rl:test')
  assert.equal(windowMs, 60000)
  assert.equal(max, 5)
  assert.equal(typeof requestId, 'string')
  assert.match(requestId as string, /^[0-9a-f-]{36}$/i)
})

test('slidingWindowRateLimitScript 使用 ZSET 维护滑动窗口', () => {
  assert.match(slidingWindowRateLimitScript, /TIME/)
  assert.match(slidingWindowRateLimitScript, /ZREMRANGEBYSCORE/)
  assert.match(slidingWindowRateLimitScript, /ZCARD/)
  assert.match(slidingWindowRateLimitScript, /ZADD/)
  assert.match(slidingWindowRateLimitScript, /PEXPIRE/)
})

test('rateLimitWithClient 在超限时返回 ok=false', async () => {
  const client: RateLimitEvalClient = {
    async eval() {
      return [0, 5]
    },
  }

  const result = await rateLimitWithClient(client, 'rl:test', 5, 60)
  assert.deepEqual(result, { ok: false, remaining: 0 })
})
