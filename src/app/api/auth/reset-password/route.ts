import bcrypt from 'bcryptjs'
import { resetPasswordWithDeps } from '@/lib/auth/password-route-core'
import { prisma } from '@/lib/infra/prisma'
import { revokeAllSessions } from '@/lib/auth/session-version'
import { verifyCode } from '@/lib/auth/verify-code'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/http/validate-request'
import { resetPasswordSchema } from '@/lib/http/validators'

export async function POST(req: Request) {
  const body = await parseJsonBody(req, resetPasswordSchema)
  if (isValidationErrorResponse(body)) return body

  return resetPasswordWithDeps(body, {
    verifyResetCode: (email, code) => verifyCode('reset-password', email, code),
    findUserByEmail: (email) => prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    }),
    hashPassword: (password) => bcrypt.hash(password, 12),
    updatePasswordByEmail: (email, passwordHash) => prisma.user.update({
      where: { email },
      data: { passwordHash },
    }),
    revokeAllSessions,
  })
}
