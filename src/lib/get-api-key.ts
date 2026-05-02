import { prisma } from './prisma'

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

/**
 * 获取用户自定义的 Zhipu API Key
 * 如果用户未设置，返回 null（调用方使用环境变量作为备选）
 */
export async function getUserApiKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { zhipuApiKey: true },
  })
  return user?.zhipuApiKey ?? null
}

/**
 * 获取用户的 RAG 参数配置，缺失字段用默认值补全
 */
export async function getUserRagConfig(userId: string): Promise<UserRagConfig> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { zhipuApiKey: true, ragConfig: true },
  })
  const saved = (user?.ragConfig ?? {}) as Partial<UserRagConfig>
  return {
    chunkSize: saved.chunkSize ?? DEFAULT_RAG.chunkSize,
    overlap: saved.overlap ?? DEFAULT_RAG.overlap,
    topK: saved.topK ?? DEFAULT_RAG.topK,
    temperature: saved.temperature ?? DEFAULT_RAG.temperature,
  }
}

/**
 * 同时获取 API Key 和 RAG 配置，只查一次 DB
 */
export async function getUserContext(userId: string): Promise<{
  apiKey: string | null
  ragConfig: UserRagConfig
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { zhipuApiKey: true, ragConfig: true },
  })
  const saved = (user?.ragConfig ?? {}) as Partial<UserRagConfig>
  return {
    apiKey: user?.zhipuApiKey ?? null,
    ragConfig: {
      chunkSize: saved.chunkSize ?? DEFAULT_RAG.chunkSize,
      overlap: saved.overlap ?? DEFAULT_RAG.overlap,
      topK: saved.topK ?? DEFAULT_RAG.topK,
      temperature: saved.temperature ?? DEFAULT_RAG.temperature,
    },
  }
}
