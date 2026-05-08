import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildEncryptedApiKeyForMigration,
  migrateLegacyUserApiKeysWithDeps,
  needsUserApiKeyMigration,
} from '../src/lib/user-api-key-migration.ts'

test('needsUserApiKeyMigration 仅识别明文 API Key', () => {
  const previousSecret = process.env.USER_API_KEY_ENCRYPTION_KEY
  process.env.USER_API_KEY_ENCRYPTION_KEY = 'test-user-api-key-secret'

  try {
    const encrypted = buildEncryptedApiKeyForMigration('sk-demo-plaintext')
    assert.equal(needsUserApiKeyMigration('sk-demo-plaintext'), true)
    assert.equal(needsUserApiKeyMigration(encrypted), false)
    assert.equal(needsUserApiKeyMigration(null), false)
    assert.equal(needsUserApiKeyMigration(''), false)
  } finally {
    process.env.USER_API_KEY_ENCRYPTION_KEY = previousSecret
  }
})

test('migrateLegacyUserApiKeysWithDeps 在 dry-run 下只统计候选项', async () => {
  const previousSecret = process.env.USER_API_KEY_ENCRYPTION_KEY
  process.env.USER_API_KEY_ENCRYPTION_KEY = 'test-user-api-key-secret'

  try {
    const listCalls: Array<{ cursor?: string; take: number }> = []
    const updateCalls: string[] = []

    const summary = await migrateLegacyUserApiKeysWithDeps(
      {
        listUsers: async (cursor, take) => {
          listCalls.push({ cursor, take })
          if (!cursor) {
            return [
              { id: 'user-1', zhipuApiKey: 'sk-plain-1' },
              { id: 'user-2', zhipuApiKey: null },
            ]
          }
          return []
        },
        updateUserApiKey: async (userId) => {
          updateCalls.push(userId)
        },
      },
      { dryRun: true, batchSize: 2 }
    )

    assert.deepEqual(listCalls, [
      { cursor: undefined, take: 2 },
      { cursor: 'user-2', take: 2 },
    ])
    assert.deepEqual(updateCalls, [])
    assert.deepEqual(summary, {
      scanned: 2,
      eligible: 1,
      migrated: 0,
      skipped: 1,
      failed: 0,
      failures: [],
    })
  } finally {
    process.env.USER_API_KEY_ENCRYPTION_KEY = previousSecret
  }
})

test('migrateLegacyUserApiKeysWithDeps 只迁移明文并记录失败', async () => {
  const previousSecret = process.env.USER_API_KEY_ENCRYPTION_KEY
  process.env.USER_API_KEY_ENCRYPTION_KEY = 'test-user-api-key-secret'

  try {
    const encrypted = buildEncryptedApiKeyForMigration('sk-already-encrypted-source')
    const updateCalls: Array<{ userId: string; encryptedApiKey: string }> = []

    const summary = await migrateLegacyUserApiKeysWithDeps(
      {
        listUsers: async (cursor) => {
          if (!cursor) {
            return [
              { id: 'user-1', zhipuApiKey: 'sk-plain-1' },
              { id: 'user-2', zhipuApiKey: encrypted },
              { id: 'user-3', zhipuApiKey: 'sk-plain-3' },
            ]
          }
          return []
        },
        updateUserApiKey: async (userId, encryptedApiKey) => {
          updateCalls.push({ userId, encryptedApiKey })
          if (userId === 'user-3') {
            throw new Error('db failed')
          }
        },
      },
      { batchSize: 10 }
    )

    assert.equal(updateCalls.length, 2)
    assert.equal(updateCalls[0]?.userId, 'user-1')
    assert.equal(updateCalls[1]?.userId, 'user-3')
    assert.match(updateCalls[0]?.encryptedApiKey ?? '', /^enc:v1:/)
    assert.match(updateCalls[1]?.encryptedApiKey ?? '', /^enc:v1:/)

    assert.deepEqual(summary, {
      scanned: 3,
      eligible: 2,
      migrated: 1,
      skipped: 1,
      failed: 1,
      failures: [{ userId: 'user-3', reason: 'db failed' }],
    })
  } finally {
    process.env.USER_API_KEY_ENCRYPTION_KEY = previousSecret
  }
})
