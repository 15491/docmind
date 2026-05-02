import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { R, Err } from '@/lib/response'

interface RagConfigBody {
  chunkSize?: number
  overlap?: number
  topK?: number
  temperature?: number
}

// GET /api/user — 获取当前登录用户信息
export const GET = withAuth(async (_req, _ctx, userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, passwordHash: true, zhipuApiKey: true, ragConfig: true },
  })
  if (!user) return Err.notFound('NOT_FOUND')

  return R.ok({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      hasPassword: !!user.passwordHash,
      zhipuApiKey: user.zhipuApiKey ? `${user.zhipuApiKey.slice(0, 6)}${'•'.repeat(16)}` : '',
      ragConfig: user.ragConfig ?? null,
    },
  })
})

// PATCH /api/user — 更新昵称 / API Key / RAG 参数
export const PATCH = withAuth(async (req, _ctx, userId) => {
  const body = await req.json()
  const { name, zhipuApiKey, ragConfig } = body as {
    name?: string
    zhipuApiKey?: string
    ragConfig?: RagConfigBody
  }

  const data: Record<string, unknown> = {}
  if (name !== undefined) {
    if (!name.trim()) return Err.invalid('昵称不能为空')
    data.name = name.trim()
  }
  if (zhipuApiKey !== undefined) {
    data.zhipuApiKey = zhipuApiKey.trim()
  }
  if (ragConfig !== undefined) {
    const { chunkSize, overlap, topK, temperature } = ragConfig
    if (chunkSize !== undefined && (chunkSize < 100 || chunkSize > 2000)) return Err.invalid('chunkSize 须在 100–2000')
    if (overlap !== undefined && (overlap < 0 || overlap > 200)) return Err.invalid('overlap 须在 0–200')
    if (topK !== undefined && (topK < 1 || topK > 20)) return Err.invalid('topK 须在 1–20')
    if (temperature !== undefined && (temperature < 0 || temperature > 1)) return Err.invalid('temperature 须在 0–1')
    data.ragConfig = ragConfig
  }

  if (Object.keys(data).length === 0) return Err.invalid('无可更新字段')

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true },
  })

  return R.ok({ user })
})

// DELETE /api/user — 注销账户（删除所有数据）
export const DELETE = withAuth(async (_req, _ctx, userId) => {
  await prisma.user.delete({ where: { id: userId } })
  return R.noData()
})
