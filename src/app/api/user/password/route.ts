import bcrypt from 'bcryptjs'
import { changePasswordWithDeps } from '@/lib/auth/password-route-core'
import { prisma } from '@/lib/infra/prisma'
import { revokeAllSessions } from '@/lib/auth/session-version'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/http/validate-request'
import { changePasswordSchema } from '@/lib/http/validators'
import { withAuth } from '@/lib/http/with-auth'

export const PATCH = withAuth(async (req, _ctx, userId) => {
  const body = await parseJsonBody(req, changePasswordSchema)
  if (isValidationErrorResponse(body)) return body

  return changePasswordWithDeps(userId, body, {
    findUserById: async (id) => {
      const account = await prisma.account.findUnique({
        where: { userId_providerId: { userId: id, providerId: 'credential' } },
        select: { password: true },
      })
      return { credentialAccount: account ?? null }
    },
    comparePassword: (input, hash) => bcrypt.compare(input, hash),
    hashPassword: (password) => bcrypt.hash(password, 10),
    updatePassword: (id, password) => prisma.account.update({
      where: { userId_providerId: { userId: id, providerId: 'credential' } },
      data: { password },
    }),
    revokeAllSessions,
  })
})
