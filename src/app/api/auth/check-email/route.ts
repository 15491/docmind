import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/validate-request'
import { authCheckEmailSchema } from '@/lib/validators'

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`rl:check-email:${req.headers.get('x-forwarded-for') ?? 'unknown'}`, 20, 60)
  if (!ok) return Err.tooMany('操作过于频繁，请稍后再试')

  const body = await parseJsonBody(req, authCheckEmailSchema)
  if (isValidationErrorResponse(body)) return body

  const { email } = body
  const user = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true, accounts: { select: { provider: true } } },
  })

  if (!user) return R.ok({ status: 'not_found' })
  if (user.passwordHash) return R.ok({ status: 'password' })
  if (user.accounts.length > 0) {
    return R.ok({ status: 'oauth', providers: user.accounts.map((account) => account.provider) })
  }

  return R.ok({ status: 'not_found' })
}
