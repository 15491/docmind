import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { R, Err } from '@/lib/response'

// GET /api/user — 获取当前登录用户信息
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Err.unauthorized()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, passwordHash: true, zhipuApiKey: true },
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
    },
  })
}

// PATCH /api/user — 更新昵称 / API Key
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Err.unauthorized()

  const body = await req.json()
  const { name, zhipuApiKey } = body as { name?: string; zhipuApiKey?: string }

  const data: Record<string, string> = {}
  if (name !== undefined) {
    if (!name.trim()) return Err.invalid('昵称不能为空')
    data.name = name.trim()
  }
  if (zhipuApiKey !== undefined) {
    data.zhipuApiKey = zhipuApiKey.trim()
  }

  if (Object.keys(data).length === 0)
    return Err.invalid('无可更新字段')

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true },
  })

  return R.ok({ user })
}

// DELETE /api/user — 注销账户（删除所有数据）
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return Err.unauthorized()

  await prisma.user.delete({ where: { id: session.user.id } })

  return R.noData()
}
