import Redis, { type RedisOptions } from "ioredis"

const globalForRedis = globalThis as unknown as { redis?: Redis; rateLimitRedis?: Redis }

function parseRedisQueryValue(value: string): boolean | number | string {
  if (value === "true") return true
  if (value === "false") return false

  const numericValue = Number(value)
  if (!Number.isNaN(numericValue) && value.trim() !== "") {
    return numericValue
  }

  return value
}

function getRedisOptions(): RedisOptions {
  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    throw new Error("REDIS_URL is not set")
  }

  const parsedUrl = new URL(redisUrl)
  const queryOptions = Object.fromEntries(
    Array.from(parsedUrl.searchParams.entries()).map(([key, value]) => [key, parseRedisQueryValue(value)]),
  )

  const options: Record<string, unknown> = { ...queryOptions }

  if (parsedUrl.hostname) {
    options.host = parsedUrl.hostname
  }

  if (parsedUrl.port) {
    options.port = Number.parseInt(parsedUrl.port, 10)
  }

  if (parsedUrl.username) {
    options.username = decodeURIComponent(parsedUrl.username)
  }

  if (parsedUrl.password) {
    options.password = decodeURIComponent(parsedUrl.password)
  }

  const db = parsedUrl.pathname.replace(/^\//, "")
  if (db) {
    const parsedDb = Number.parseInt(db, 10)
    if (!Number.isNaN(parsedDb)) {
      options.db = parsedDb
    }
  }

  if (parsedUrl.protocol === "rediss:") {
    options.tls = {}
  }

  return options as RedisOptions
}

const baseRedisOptions = getRedisOptions()

export const redis = globalForRedis.redis ?? new Redis({
  ...baseRedisOptions,
  maxRetriesPerRequest: null,
  connectTimeout: 3000,
  lazyConnect: false,
})

export const rateLimitRedis = globalForRedis.rateLimitRedis ?? new Redis({
  ...baseRedisOptions,
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
  lazyConnect: false,
})

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
  globalForRedis.rateLimitRedis = rateLimitRedis
}
