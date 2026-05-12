import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRateLimitKey,
  getClientIp,
  normalizeEmailAddress,
} from '../src/lib/auth/auth-rate-limit-core.ts'

test('normalizeEmailAddress 会统一 trim 并转小写', () => {
  assert.equal(normalizeEmailAddress('  USER@Example.COM  '), 'user@example.com')
})

test('getClientIp 优先取 x-forwarded-for 的第一个 IP', () => {
  const req = new Request('http://localhost/api/test', {
    headers: {
      'x-forwarded-for': '1.1.1.1, 2.2.2.2',
      'x-real-ip': '3.3.3.3',
    },
  })

  assert.equal(getClientIp(req), '1.1.1.1')
})

test('buildRateLimitKey 会散列原始标识，避免直接暴露值', () => {
  const key = buildRateLimitKey('rl:test', 'user@example.com')
  assert.match(key, /^rl:test:[0-9a-f]{24}$/)
  assert.equal(key.includes('user@example.com'), false)
})
