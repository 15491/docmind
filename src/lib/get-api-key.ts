import { decryptStoredApiKey, isEncryptedApiKey } from './api-key-crypto'
import { prisma } from './prisma'
import { buildEncryptedApiKeyForMigration } from './user-api-key-migration'

export interface UserRagConfig {
  chunkSize: number
  overlap: number
  topK: number
  temperature: number
}

const DEFAULT_RAG: UserRagConfig = {
  chunkSize: 500,
  overlap: 50,
  topK: 5,
  temperature: 0.7,
}

function normalizeRagConfig(saved: Partial<UserRagConfig> | null | undefined): UserRagConfig {
  return {
    chunkSize: saved?.chunkSize ?? DEFAULT_RAG.chunkSize,
    overlap: saved?.overlap ?? DEFAULT_RAG.overlap,
    topK: saved?.topK ?? DEFAULT_RAG.topK,
    temperature: saved?.temperature ?? DEFAULT_RAG.temperature,
  }
}

export async function resolveStoredUserApiKey(
  userId: string,
  storedApiKey: string | null | undefined
): Promise<string | null> {
  if (!storedApiKey) {
    return null
  }

  if (isEncryptedApiKey(storedApiKey)) {
    return decryptStoredApiKey(storedApiKey)
  }

  const encryptedApiKey = buildEncryptedApiKeyForMigration(storedApiKey)
  if (!encryptedApiKey) {
    return storedApiKey
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { zhipuApiKey: encryptedApiKey },
    })
  } catch (error) {
    console.error(
      '[user-api-key] Failed to migrate legacy plaintext key:',
      error instanceof Error ? error.message : String(error)
    )
  }

  return storedApiKey
}

export async function getUserApiKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { zhipuApiKey: true },
  })

  return resolveStoredUserApiKey(userId, user?.zhipuApiKey)
}

export async function getUserRagConfig(userId: string): Promise<UserRagConfig> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ragConfig: true },
  })

  return normalizeRagConfig((user?.ragConfig ?? {}) as Partial<UserRagConfig>)
}

export async function getUserContext(userId: string): Promise<{
  apiKey: string | null
  ragConfig: UserRagConfig
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { zhipuApiKey: true, ragConfig: true },
  })

  return {
    apiKey: await resolveStoredUserApiKey(userId, user?.zhipuApiKey),
    ragConfig: normalizeRagConfig((user?.ragConfig ?? {}) as Partial<UserRagConfig>),
  }
}
