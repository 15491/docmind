import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyCode } from '@/lib/verify-code'
import { R, Err } from '@/lib/response'

// PATCH /api/user/email — 修改绑定邮箱
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Err.unauthorized()
    }

    const body = await req.json().catch(() => null) as { email?: string; code?: string } | null
    const { email, code } = body ?? {}

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Err.invalid('邮箱格式不正确')
    }
    if (!code || typeof code !== 'string') {
      return Err.invalid('验证码不能为空')
    }

    const result = await verifyCode('change-email', email, code)
    if (!result.ok) {
      return Err.invalid(result.error)
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.id !== session.user.id) {
      return Err.conflict('该邮箱已被其他账户使用')
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { email },
    })

    return R.noData()
  } catch (error) {
    console.error('[/api/user/email] Error:', error)
    return Err.internal('修改邮箱失败')
  }
}
