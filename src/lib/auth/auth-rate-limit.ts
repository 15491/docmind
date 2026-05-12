import {
  buildRateLimitKey,
  getClientIp,
  normalizeEmailAddress,
} from './auth-rate-limit-core'
import { rateLimit } from '@/lib/http/rate-limit'

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

export async function limitCredentialsSignInRequest(req: HeaderCarrier, email: string) {
  const normalizedEmail = normalizeEmailAddress(email)
  const clientIp = getClientIp(req)
  const limits = await Promise.all([
    rateLimit(buildRateLimitKey('rl:signin:ip', clientIp), 30, 600),
    rateLimit(buildRateLimitKey('rl:signin:email', normalizedEmail || 'unknown'), 10, 600),
  ])

  return {
    ok: limits.every((limit) => limit.ok),
    remaining: Math.min(...limits.map((limit) => limit.remaining)),
  }
}
