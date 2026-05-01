import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyCode } from '@/lib/verify-code'
import { R, Err } from '@/lib/response'

export async function POST(req: Request) {
  const { email, code, newPassword } = await req.json()

  if (!email || !code || !newPassword) {
    return Err.invalid('参数不完整')
  }

  if (newPassword.length < 8) {
    return Err.invalid('密码至少 8 位')
  }

  const result = await verifyCode('reset-password', email, code)
  if (!result.ok) {
    return Err.invalid(result.error)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return Err.notFound('账号不存在')
  }

  // OAuth 账号没有密码，不能通过此流程重置
  if (!user.passwordHash) {
    return Err.invalid('该账号通过第三方登录，无法设置密码')
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { email }, data: { passwordHash } })

  return R.noData()
}
