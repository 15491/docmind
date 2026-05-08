import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/validate-request'
import { changePasswordSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const PATCH = withAuth(async (req, _ctx, userId) => {
  const body = await parseJsonBody(req, changePasswordSchema)
  if (isValidationErrorResponse(body)) return body

  const { oldPassword, newPassword } = body
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.passwordHash) return Err.invalid('该账号通过第三方登录，无法修改密码')

  const valid = await bcrypt.compare(oldPassword, user.passwordHash)
  if (!valid) return Err.invalid('当前密码不正确')

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })

  return R.noData()
})
