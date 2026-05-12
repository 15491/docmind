import { changeEmailWithDeps } from '@/lib/route-core/email-route-core'
import { isUniqueConstraintError } from '@/lib/infra/prisma-errors'
import { prisma } from '@/lib/infra/prisma'
import { verifyCode } from '@/lib/auth/verify-code'
import { Err } from '@/lib/http/response'
import { revokeAllSessions } from '@/lib/auth/session-version'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/http/validate-request'
import { changeEmailSchema } from '@/lib/http/validators'
import { withAuth } from '@/lib/http/with-auth'

export const PATCH = withAuth(async (req, _ctx, userId) => {
  try {
    const body = await parseJsonBody(req, changeEmailSchema)
    if (isValidationErrorResponse(body)) return body

    const { email, code } = body
    return changeEmailWithDeps(userId, { email, code }, {
      verifyChangeEmailCode: (targetEmail, inputCode) => verifyCode('change-email', targetEmail, inputCode),
      findUserByEmail: (targetEmail) => prisma.user.findUnique({
        where: { email: targetEmail },
        select: { id: true },
      }),
      updateEmailByUserId: (id, targetEmail) => prisma.user.update({
        where: { id },
        data: { email: targetEmail },
      }),
      revokeAllSessions,
    })
  } catch (error) {
    if (isUniqueConstraintError(error, 'email')) {
      return Err.conflict('该邮箱已被其他账号使用')
    }

    console.error('[/api/user/email] Error:', error)
    return Err.internal('修改邮箱失败')
  }
})
