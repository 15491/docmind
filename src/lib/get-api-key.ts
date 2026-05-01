import { prisma } from './prisma'

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
