import { prisma } from '@/lib/prisma'
import { verifyCode } from '@/lib/verify-code'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/validate-request'
import { changeEmailSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const PATCH = withAuth(async (req, _ctx, userId) => {
  try {
    const body = await parseJsonBody(req, changeEmailSchema)
    if (isValidationErrorResponse(body)) return body

    const { email, code } = body
    const result = await verifyCode('change-email', email, code)
    if (!result.ok) return Err.invalid(result.error)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.id !== userId) return Err.conflict('该邮箱已被其他账号使用')

    await prisma.user.update({ where: { id: userId }, data: { email } })
    return R.noData()
  } catch (error) {
    console.error('[/api/user/email] Error:', error)
    return Err.internal('修改邮箱失败')
  }
})
