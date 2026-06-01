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

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, emailVerified: false },
      })
      await tx.account.create({
        data: {
          accountId: email,
          providerId: 'credential',
          userId: user.id,
          password: passwordHash,
        },
      })
    })
  } catch (error) {
    if (isUniqueConstraintError(error, 'email')) {
      return Err.conflict('该邮箱已注册')
    }
    throw error
  }

  return R.noData()
}
