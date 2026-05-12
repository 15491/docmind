import { NextRequest } from 'next/server'
import { limitSendCodeRequest } from '@/lib/auth/auth-rate-limit'
import { THIRD_PARTY_PASSWORD_SETUP_MESSAGE } from '@/lib/auth/auth-messages'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/infra/prisma'
import { Err, R } from '@/lib/http/response'
import { sendVerifyCode, type VerifyPurpose } from '@/lib/auth/verify-code'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/http/validate-request'
import { sendCodeSchema } from '@/lib/http/validators'

export async function POST(req: NextRequest) {
  const body = await parseJsonBody(req, sendCodeSchema)
  if (isValidationErrorResponse(body)) return body

  const { email, purpose } = body
  const { ok } = await limitSendCodeRequest(req, email, purpose)
  if (!ok) return Err.tooMany('发送过于频繁，请稍后再试')

  if (purpose === 'register') {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return Err.conflict('该邮箱已注册')
  }

  if (purpose === 'reset-password') {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true },
    })
    if (!existing) return Err.notFound('该邮箱未注册')
    if (!existing.passwordHash) return Err.invalid(THIRD_PARTY_PASSWORD_SETUP_MESSAGE)
  }

  if (purpose === 'change-email') {
    const session = await auth()
    if (!session?.user?.id) return Err.unauthorized()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return Err.conflict('该邮箱已被其他账号使用')
  }

  try {
    await sendVerifyCode(purpose as VerifyPurpose, email)
    return R.noData()
  } catch (error: unknown) {
    if (error instanceof Error && (error as NodeJS.ErrnoException & { code?: string }).code === 'COOLDOWN') {
      return Err.tooMany(error.message)
    }

    console.error('[send-code]', error instanceof Error ? error.message : String(error))
    return Err.internal('发送失败，请稍后重试')
  }
}
