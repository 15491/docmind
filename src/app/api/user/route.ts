import { prisma } from '@/lib/prisma'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/validate-request'
import { updateUserSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (_req, _ctx, userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      passwordHash: true,
      zhipuApiKey: true,
      ragConfig: true,
    },
  })
  if (!user) return Err.notFound('用户不存在')

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

export const PATCH = withAuth(async (req, _ctx, userId) => {
  const body = await parseJsonBody(req, updateUserSchema)
  if (isValidationErrorResponse(body)) return body

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.zhipuApiKey !== undefined) data.zhipuApiKey = body.zhipuApiKey
  if (body.ragConfig !== undefined) data.ragConfig = body.ragConfig

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true },
  })

  return R.ok({ user })
})

export const DELETE = withAuth(async (_req, _ctx, userId) => {
  await prisma.user.delete({ where: { id: userId } })
  return R.noData()
})
