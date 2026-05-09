import {
  buildRateLimitKey,
  getClientIp,
  normalizeEmailAddress,
} from './auth-rate-limit-core'
import { rateLimit } from './rate-limit'

type HeaderCarrier = {
  headers: Pick<Headers, 'get'>
}

export { buildRateLimitKey, getClientIp, normalizeEmailAddress } from './auth-rate-limit-core'

export async function limitSendCodeRequest(
  req: HeaderCarrier,
  email: string,
  purpose: 'register' | 'reset-password' | 'change-email'
) {
  const normalizedEmail = normalizeEmailAddress(email)
  const clientIp = getClientIp(req)
  const [emailLimit, ipLimit] = await Promise.all([
    rateLimit(buildRateLimitKey(`rl:send-code:email:${purpose}`, normalizedEmail), 5, 3600),
    rateLimit(buildRateLimitKey(`rl:send-code:ip:${purpose}`, clientIp), 20, 3600),
  ])

  return {
    ok: emailLimit.ok && ipLimit.ok,
    remaining: Math.min(emailLimit.remaining, ipLimit.remaining),
  }
}
