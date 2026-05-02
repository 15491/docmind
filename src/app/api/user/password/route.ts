import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { R, Err } from '@/lib/response'

// PATCH /api/user/password — 修改密码（需要验证旧密码）
export const PATCH = withAuth(async (req, _ctx, userId) => {
  const { oldPassword, newPassword } = await req.json()
  if (!oldPassword || !newPassword) return Err.invalid('参数不完整')
  if (newPassword.length < 8) return Err.invalid('新密码至少 8 位')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.passwordHash) return Err.invalid('该账号通过第三方登录，无法修改密码')

  const valid = await bcrypt.compare(oldPassword, user.passwordHash)
  if (!valid) return Err.invalid('当前密码不正确')

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })

  return R.noData()
})
