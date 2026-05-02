import { redis } from './redis'

const KEY = (userId: string) => `session:ver:${userId}`
const TTL = 60 * 60 * 24 * 30 // 30 天，与 NextAuth maxAge 对齐

// 写入新版本号（登录时调用），返回生成的版本号
export async function createSessionVersion(userId: string): Promise<string> {
  const version = crypto.randomUUID()
  await redis.set(KEY(userId), version, 'EX', TTL)
  return version
}

// 读取当前有效版本号
export async function getSessionVersion(userId: string): Promise<string | null> {
  return redis.get(KEY(userId))
}

// 使当前用户所有设备的 session 失效（踢出其他设备）
export async function revokeAllSessions(userId: string): Promise<void> {
  await redis.del(KEY(userId))
}
