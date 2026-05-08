import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyCode } from '@/lib/verify-code'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/validate-request'
import { registerSchema } from '@/lib/validators'

export async function POST(req: Request) {
  const body = await parseJsonBody(req, registerSchema)
  if (isValidationErrorResponse(body)) return body

  const { name, email, password, code } = body
  const result = await verifyCode('register', email, code)
  if (!result.ok) return Err.invalid(result.error)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return Err.conflict('该邮箱已注册')

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { name, email, passwordHash, emailVerified: new Date() },
  })

  return R.noData()
}
