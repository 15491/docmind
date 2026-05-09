import assert from 'node:assert/strict'
import test from 'node:test'
import { changeEmailWithDeps } from '../src/lib/email-route-core.ts'

test('changeEmailWithDeps updates the email and revokes existing sessions', async () => {
  const calls: string[] = []

  const response = await changeEmailWithDeps(
    'user-1',
    { email: 'next@example.com', code: '123456' },
    {
      verifyChangeEmailCode: async (email, code) => {
        calls.push(`verify:${email}:${code}`)
        return { ok: true }
      },
      findUserByEmail: async (email) => {
        calls.push(`find:${email}`)
        return null
      },
      updateEmailByUserId: async (userId, email) => {
        calls.push(`update:${userId}:${email}`)
      },
      revokeAllSessions: async (userId) => {
        calls.push(`revoke:${userId}`)
      },
    }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(calls, [
    'verify:next@example.com:123456',
    'find:next@example.com',
    'update:user-1:next@example.com',
    'revoke:user-1',
  ])
})

test('changeEmailWithDeps rejects emails already used by another account', async () => {
  const calls: string[] = []

  const response = await changeEmailWithDeps(
    'user-1',
    { email: 'next@example.com', code: '123456' },
    {
      verifyChangeEmailCode: async (email, code) => {
        calls.push(`verify:${email}:${code}`)
        return { ok: true }
      },
      findUserByEmail: async (email) => {
        calls.push(`find:${email}`)
        return { id: 'user-2' }
      },
      updateEmailByUserId: async () => {
        calls.push('update')
      },
      revokeAllSessions: async () => {
        calls.push('revoke')
      },
    }
  )

  assert.equal(response.status, 409)
  assert.deepEqual(calls, [
    'verify:next@example.com:123456',
    'find:next@example.com',
  ])
})
