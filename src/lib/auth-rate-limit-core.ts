import { createHash } from 'node:crypto'

type HeaderCarrier = {
  headers: Pick<Headers, 'get'>
}

function hashIdentifier(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24)
}

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase()
}

export function getClientIp(req: HeaderCarrier): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(',')
      .map((value) => value.trim())
      .find(Boolean)

    if (firstIp) {
      return firstIp
    }
  }

  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

export function buildRateLimitKey(scope: string, identifier: string): string {
  return `${scope}:${hashIdentifier(identifier)}`
}
