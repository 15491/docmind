import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyCode } from '@/lib/verify-code'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/validate-request'
import { resetPasswordSchema } from '@/lib/validators'

export async function POST(req: Request) {
  const body = await parseJsonBody(req, resetPasswordSchema)
  if (isValidationErrorResponse(body)) return body

  const { email, code, newPassword } = body
  const result = await verifyCode('reset-password', email, code)
  if (!result.ok) return Err.invalid(result.error)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return Err.notFound('账号不存在')
  if (!user.passwordHash) return Err.invalid('该账号通过第三方登录，无法设置密码')

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { email }, data: { passwordHash } })

  return R.noData()
}
