import Redis from "ioredis"

const globalForRedis = globalThis as unknown as { redis: Redis }

export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 1,   // 失败立即抛错，不卡 30 秒
  connectTimeout: 3000,
  lazyConnect: false,
})

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis
