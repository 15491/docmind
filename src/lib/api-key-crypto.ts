import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ENCRYPTED_PREFIX = 'enc:v1:'
const MASK_CHAR = '•'
const MASK_SUFFIX_LENGTH = 16
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionSecret(): string | null {
  return process.env.USER_API_KEY_ENCRYPTION_KEY
    ?? process.env.AUTH_SECRET
    ?? process.env.NEXTAUTH_SECRET
    ?? null
}

function getEncryptionKey(): Buffer {
  const secret = getEncryptionSecret()
  if (!secret) {
    throw new Error('Missing USER_API_KEY_ENCRYPTION_KEY or AUTH_SECRET for user API key encryption')
  }

  return createHash('sha256').update(secret).digest()
}

export function isEncryptedApiKey(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX)
}

export function looksLikeMaskedApiKey(value: string): boolean {
  return value.includes(MASK_CHAR)
}

export function encryptUserApiKey(apiKey: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(apiKey, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  const payload = Buffer.concat([iv, authTag, encrypted]).toString('base64url')

  return `${ENCRYPTED_PREFIX}${payload}`
}

export function decryptStoredApiKey(storedValue: string | null | undefined): string | null {
  if (!storedValue) {
    return null
  }

  if (!isEncryptedApiKey(storedValue)) {
    return storedValue
  }

  const payload = storedValue.slice(ENCRYPTED_PREFIX.length)
  const buffer = Buffer.from(payload, 'base64url')
  if (buffer.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted user API key payload')
  }

  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8')
}

export function maskUserApiKey(apiKey: string | null | undefined): string {
  if (!apiKey) {
    return ''
  }

  return `${apiKey.slice(0, 6)}${MASK_CHAR.repeat(MASK_SUFFIX_LENGTH)}`
}
