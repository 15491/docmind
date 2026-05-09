import assert from 'node:assert/strict'
import test from 'node:test'
import { hydrateSessionUser, syncSessionVersionToken } from '../src/lib/auth-callbacks.ts'

test('syncSessionVersionToken 登录时写入新的 sessionVersion', async () => {
  const token = { sub: undefined, sessionVersion: undefined }

  const result = await syncSessionVersionToken(token, { id: 'user-1' }, {
    createSessionVersion: async (userId) => `ver:${userId}`,
    getSessionVersion: async () => null,
  })

  assert.equal(result.sub, 'user-1')
  assert.equal(result.sessionVersion, 'ver:user-1')
})

test('syncSessionVersionToken 在版本失效时清空 token 身份', async () => {
  const result = await syncSessionVersionToken(
    { sub: 'user-1', sessionVersion: 'stale-version' },
    undefined,
    {
      createSessionVersion: async () => {
        throw new Error('should not create a new version')
      },
      getSessionVersion: async () => 'current-version',
    }
  )

  assert.equal(result.sub, undefined)
  assert.equal(result.sessionVersion, undefined)
})

test('hydrateSessionUser 会把 token.sub 映射到 session.user.id', () => {
  const session = hydrateSessionUser(
    { user: { name: 'Alice' }, expires: '2099-01-01T00:00:00.000Z' },
    { sub: 'user-1' }
  )

  assert.equal(session.user.id, 'user-1')
  assert.equal(session.user.name, 'Alice')
})
