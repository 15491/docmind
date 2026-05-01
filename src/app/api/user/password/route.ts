import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { R, Err } from '@/lib/response'

// PATCH /api/user/password — 修改密码（需要验证旧密码）
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Err.unauthorized()

  const { oldPassword, newPassword } = await req.json()
  if (!oldPassword || !newPassword)
    return Err.invalid('参数不完整')
  if (newPassword.length < 8)
    return Err.invalid('新密码至少 8 位')

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.passwordHash)
    return Err.invalid('该账号通过第三方登录，无法修改密码')

  const valid = await bcrypt.compare(oldPassword, user.passwordHash)
  if (!valid) return Err.invalid('当前密码不正确')

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

  return R.noData()
}
