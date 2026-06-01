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
    findUserByEmail: async (email) => {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          accounts: {
            where: { providerId: 'credential' },
            select: { password: true },
            take: 1,
          },
        },
      })
      if (!user) return null
      return {
        id: user.id,
        credentialAccount: user.accounts[0] ?? null,
      }
    },
    hashPassword: (password) => bcrypt.hash(password, 10),
    updatePassword: (userId, password) => prisma.account.update({
      where: { userId_providerId: { userId, providerId: 'credential' } },
      data: { password },
    }),
    revokeAllSessions,
  })
}
