import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decryptStoredApiKey,
  encryptUserApiKey,
  isEncryptedApiKey,
  looksLikeMaskedApiKey,
  maskUserApiKey,
} from '../src/lib/api-key-crypto.ts'

test('encryptUserApiKey 与 decryptStoredApiKey 可以往返还原', () => {
  const previousSecret = process.env.USER_API_KEY_ENCRYPTION_KEY
  process.env.USER_API_KEY_ENCRYPTION_KEY = 'test-user-api-key-secret'

  try {
    const encrypted = encryptUserApiKey('sk-demo-123456')
    assert.equal(isEncryptedApiKey(encrypted), true)
    assert.notEqual(encrypted, 'sk-demo-123456')
    assert.equal(decryptStoredApiKey(encrypted), 'sk-demo-123456')
  } finally {
    process.env.USER_API_KEY_ENCRYPTION_KEY = previousSecret
  }
})

test('decryptStoredApiKey 兼容旧版明文值', () => {
  assert.equal(decryptStoredApiKey('sk-legacy'), 'sk-legacy')
  assert.equal(decryptStoredApiKey(null), null)
})

test('maskUserApiKey 与 looksLikeMaskedApiKey 识别掩码值', () => {
  const masked = maskUserApiKey('sk-demo-123456')
  assert.equal(masked, 'sk-dem••••••••••••••••')
  assert.equal(looksLikeMaskedApiKey(masked), true)
  assert.equal(looksLikeMaskedApiKey('sk-demo-123456'), false)
})
