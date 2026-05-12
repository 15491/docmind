import bcrypt from 'bcryptjs'
import { isUniqueConstraintError } from '@/lib/infra/prisma-errors'
import { prisma } from '@/lib/infra/prisma'
import { verifyCode } from '@/lib/auth/verify-code'
import { Err, R } from '@/lib/http/response'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/http/validate-request'
import { registerSchema } from '@/lib/http/validators'

export async function POST(req: Request) {
  const body = await parseJsonBody(req, registerSchema)
  if (isValidationErrorResponse(body)) return body

  const { name, email, password, code } = body
  const result = await verifyCode('register', email, code)
  if (!result.ok) return Err.invalid(result.error)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return Err.conflict('该邮箱已注册')

  const passwordHash = await bcrypt.hash(password, 12)
  try {
    await prisma.user.create({
      data: { name, email, passwordHash, emailVerified: new Date() },
    })
  } catch (error) {
    if (isUniqueConstraintError(error, 'email')) {
      return Err.conflict('该邮箱已注册')
    }

    throw error
  }

  return R.noData()
}
