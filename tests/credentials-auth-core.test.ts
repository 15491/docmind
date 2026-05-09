import assert from 'node:assert/strict'
import test from 'node:test'
import {
  authorizeCredentialsWithDeps,
  authorizeCredentialsWithRateLimitDeps,
} from '../src/lib/credentials-auth-core.ts'

test('authorizeCredentialsWithDeps 会先标准化邮箱再查找用户', async () => {
  const calls: string[] = []

  const result = await authorizeCredentialsWithDeps(
    { email: '  USER@Example.COM  ', password: 'secret-123' },
    {
      comparePassword: async (password, passwordHash) => {
        calls.push(`compare:${password}:${passwordHash}`)
        return true
      },
      findUserByEmail: async (email) => {
        calls.push(`find:${email}`)
        return {
          id: 'user-1',
          email,
          name: 'Alice',
          image: null,
          passwordHash: 'hash-1',
        }
      },
    }
  )

  assert.deepEqual(calls, [
    'find:user@example.com',
    'compare:secret-123:hash-1',
  ])
  assert.deepEqual(result, {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Alice',
    image: null,
  })
})

test('authorizeCredentialsWithDeps 对仅 OAuth 账户返回 oauth_only', async () => {
  const result = await authorizeCredentialsWithDeps(
    { email: 'user@example.com', password: 'secret-123' },
    {
      comparePassword: async () => {
        throw new Error('should not compare password')
      },
      findUserByEmail: async () => ({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        image: null,
        passwordHash: null,
      }),
    }
  )

  assert.equal(result, 'oauth_only')
})

test('authorizeCredentialsWithRateLimitDeps 在限流时直接返回 rate_limited', async () => {
  const request = new Request('http://localhost/api/auth/callback/credentials')
  const result = await authorizeCredentialsWithRateLimitDeps(
    { email: 'user@example.com', password: 'secret-123' },
    request,
    {
      limitSignInAttempt: async () => ({ ok: false }),
      comparePassword: async () => {
        throw new Error('should not compare password')
      },
      findUserByEmail: async () => {
        throw new Error('should not query user')
      },
    }
  )

  assert.equal(result, 'rate_limited')
})
