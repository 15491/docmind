import assert from 'node:assert/strict'
import test from 'node:test'
import { sendVerifyCodeWithDeps } from '../src/lib/auth/verify-code.ts'

test('sendVerifyCodeWithDeps deletes the new record when email sending fails', async () => {
  const calls: string[] = []
  const originalDateNow = Date.now
  Date.now = () => 1_700_000_000_000

  try {
    await assert.rejects(
      () => sendVerifyCodeWithDeps('register', 'user@example.com', {
        getRecord: async () => null,
        getRecordTtl: async () => 0,
        setRecord: async (_key, ttlSeconds) => {
          calls.push(`set:${ttlSeconds}`)
        },
        deleteRecord: async () => {
          calls.push('delete')
        },
        sendEmail: async () => {
          throw new Error('send failed')
        },
      }),
      /send failed/
    )

    assert.deepEqual(calls, ['set:300', 'delete'])
  } finally {
    Date.now = originalDateNow
  }
})

test('sendVerifyCodeWithDeps restores the previous record when resend fails', async () => {
  const calls: string[] = []
  const previousRaw = JSON.stringify({
    code: '111111',
    attempts: 0,
    sentAt: 1_700_000_000 - 61,
  })
  const originalDateNow = Date.now
  Date.now = () => 1_700_000_000_000

  try {
    await assert.rejects(
      () => sendVerifyCodeWithDeps('reset-password', 'user@example.com', {
        getRecord: async () => previousRaw,
        getRecordTtl: async () => 120,
        setRecord: async (_key, ttlSeconds, value) => {
          calls.push(`set:${ttlSeconds}:${value === previousRaw ? 'previous' : 'next'}`)
        },
        deleteRecord: async () => {
          calls.push('delete')
        },
        sendEmail: async () => {
          throw new Error('send failed')
        },
      }),
      /send failed/
    )

    assert.deepEqual(calls, ['set:300:next', 'set:120:previous'])
  } finally {
    Date.now = originalDateNow
  }
})
