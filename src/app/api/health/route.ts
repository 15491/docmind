import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { esClient } from '@/lib/elasticsearch'
import { minioClient, BUCKET } from '@/lib/minio'

const CHECK_TIMEOUT_MS = 3000

function withTimeout<T>(label: string, run: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timeout after ${CHECK_TIMEOUT_MS}ms`)),
      CHECK_TIMEOUT_MS,
    )
    run().then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

const checks = {
  postgres: () => withTimeout('postgres', () => prisma.$queryRaw`SELECT 1`),
  redis: () => withTimeout('redis', () => redis.ping()),
  elasticsearch: () => withTimeout('elasticsearch', () => esClient.ping()),
  minio: () => withTimeout('minio', () => minioClient.bucketExists(BUCKET)),
} as const

export async function GET() {
  const names = Object.keys(checks) as (keyof typeof checks)[]
  const results = await Promise.allSettled(names.map((name) => checks[name]()))

  const detail = Object.fromEntries(
    results.map((result, index) => {
      const name = names[index]
      if (result.status === 'fulfilled') {
        return [name, { status: 'up' as const }]
      }
      const error = result.reason instanceof Error ? result.reason.message : String(result.reason)
      return [name, { status: 'down' as const, error }]
    }),
  )

  const allOk = results.every((result) => result.status === 'fulfilled')

  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', checks: detail },
    { status: allOk ? 200 : 503 },
  )
}
