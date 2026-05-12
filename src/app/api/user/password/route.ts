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
    findUserById: (id) => prisma.user.findUnique({
      where: { id },
      select: { passwordHash: true },
    }),
    comparePassword: (inputPassword, passwordHash) => bcrypt.compare(inputPassword, passwordHash),
    hashPassword: (password) => bcrypt.hash(password, 12),
    updatePasswordByUserId: (id, passwordHash) => prisma.user.update({
      where: { id },
      data: { passwordHash },
    }),
    revokeAllSessions,
  })
})
