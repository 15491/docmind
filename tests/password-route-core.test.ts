import assert from 'node:assert/strict'
import test from 'node:test'
import { changePasswordWithDeps, resetPasswordWithDeps } from '../src/lib/auth/password-route-core.ts'

test('resetPasswordWithDeps revokes existing sessions after updating the password', async () => {
  const calls: string[] = []

  const response = await resetPasswordWithDeps(
    { email: 'user@example.com', code: '123456', newPassword: 'new-password' },
    {
      verifyResetCode: async (email, code) => {
        calls.push(`verify:${email}:${code}`)
        return { ok: true }
      },
      findUserByEmail: async (email) => {
        calls.push(`find:${email}`)
        return { id: 'user-1', passwordHash: 'old-hash' }
      },
      hashPassword: async (password) => {
        calls.push(`hash:${password}`)
        return 'new-hash'
      },
      updatePasswordByEmail: async (email, passwordHash) => {
        calls.push(`update:${email}:${passwordHash}`)
      },
      revokeAllSessions: async (userId) => {
        calls.push(`revoke:${userId}`)
      },
    }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(calls, [
    'verify:user@example.com:123456',
    'find:user@example.com',
    'hash:new-password',
    'update:user@example.com:new-hash',
    'revoke:user-1',
  ])
})

test('changePasswordWithDeps revokes existing sessions after updating the password', async () => {
  const calls: string[] = []

  const response = await changePasswordWithDeps(
    'user-1',
    { oldPassword: 'old-password', newPassword: 'new-password' },
    {
      findUserById: async (userId) => {
        calls.push(`find:${userId}`)
        return { passwordHash: 'old-hash' }
      },
      comparePassword: async (password, passwordHash) => {
        calls.push(`compare:${password}:${passwordHash}`)
        return true
      },
      hashPassword: async (password) => {
        calls.push(`hash:${password}`)
        return 'new-hash'
      },
      updatePasswordByUserId: async (userId, passwordHash) => {
        calls.push(`update:${userId}:${passwordHash}`)
      },
      revokeAllSessions: async (userId) => {
        calls.push(`revoke:${userId}`)
      },
    }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(calls, [
    'find:user-1',
    'compare:old-password:old-hash',
    'hash:new-password',
    'update:user-1:new-hash',
    'revoke:user-1',
  ])
})

test('changePasswordWithDeps allows OAuth-only users to set a password', async () => {
  const calls: string[] = []

  const response = await changePasswordWithDeps(
    'user-2',
    { newPassword: 'new-password' },
    {
      findUserById: async (userId) => {
        calls.push(`find:${userId}`)
        return { passwordHash: null }
      },
      comparePassword: async (password, passwordHash) => {
        calls.push(`compare:${password}:${passwordHash}`)
        return true
      },
      hashPassword: async (password) => {
        calls.push(`hash:${password}`)
        return 'new-hash'
      },
      updatePasswordByUserId: async (userId, passwordHash) => {
        calls.push(`update:${userId}:${passwordHash}`)
      },
      revokeAllSessions: async (userId) => {
        calls.push(`revoke:${userId}`)
      },
    }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(calls, [
    'find:user-2',
    'hash:new-password',
    'update:user-2:new-hash',
    'revoke:user-2',
  ])
})

test('changePasswordWithDeps requires oldPassword when the user already has a password', async () => {
  const response = await changePasswordWithDeps(
    'user-3',
    { newPassword: 'new-password' },
    {
      findUserById: async () => ({ passwordHash: 'old-hash' }),
      comparePassword: async () => true,
      hashPassword: async () => 'new-hash',
      updatePasswordByUserId: async () => undefined,
      revokeAllSessions: async () => undefined,
    }
  )

  assert.equal(response.status, 422)

  const payload = await response.json()
  assert.equal(payload.ok, false)
  assert.equal(payload.message, '请输入当前密码')
})
