import bcrypt from 'bcryptjs'
import { resetPasswordWithDeps } from '@/lib/password-route-core'
import { prisma } from '@/lib/prisma'
import { revokeAllSessions } from '@/lib/session-version'
import { verifyCode } from '@/lib/verify-code'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/validate-request'
import { resetPasswordSchema } from '@/lib/validators'

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
