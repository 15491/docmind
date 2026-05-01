import Redis from "ioredis"

const globalForRedis = globalThis as unknown as { redis: Redis; rateLimitRedis: Redis }

// BullMQ 要求 maxRetriesPerRequest 为 null
export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  connectTimeout: 3000,
  lazyConnect: false,
})

// Rate Limit 使用独立连接，快速失败
export const rateLimitRedis = globalForRedis.rateLimitRedis ?? new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
  lazyConnect: false,
})

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
  globalForRedis.rateLimitRedis = rateLimitRedis
}
