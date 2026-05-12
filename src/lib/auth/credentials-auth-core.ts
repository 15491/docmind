import { normalizeEmailAddress } from '@/lib/email'

export interface CredentialsAuthUserRecord {
  id: string
  email: string
  name: string | null
  image: string | null
  passwordHash: string | null
}

export interface AuthorizedCredentialsUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

export type CredentialsAuthResult = AuthorizedCredentialsUser | 'oauth_only' | null

function parseCredentials(
  credentials: Partial<Record<'email' | 'password', unknown>> | undefined
) {
  const email = typeof credentials?.email === 'string'
    ? normalizeEmailAddress(credentials.email)
    : ''
  const password = typeof credentials?.password === 'string'
    ? credentials.password
    : ''

  if (!email || !password) {
    return null
  }

  return { email, password }
}

async function authorizeParsedCredentials(
  input: { email: string; password: string },
  deps: {
    comparePassword: (password: string, passwordHash: string) => boolean | Promise<boolean>
    findUserByEmail: (email: string) => Promise<CredentialsAuthUserRecord | null>
  }
): Promise<CredentialsAuthResult> {
  const user = await deps.findUserByEmail(input.email)
  if (!user) {
    return null
  }

  if (!user.passwordHash) {
    return 'oauth_only'
  }

  const valid = await deps.comparePassword(input.password, user.passwordHash)
  if (!valid) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  }
}

export async function authorizeCredentialsWithDeps(
  credentials: Partial<Record<'email' | 'password', unknown>> | undefined,
  deps: {
    comparePassword: (password: string, passwordHash: string) => boolean | Promise<boolean>
    findUserByEmail: (email: string) => Promise<CredentialsAuthUserRecord | null>
  }
): Promise<CredentialsAuthResult> {
  const parsed = parseCredentials(credentials)
  if (!parsed) {
    return null
  }

  return authorizeParsedCredentials(parsed, deps)
}

export async function authorizeCredentialsWithRateLimitDeps(
  credentials: Partial<Record<'email' | 'password', unknown>> | undefined,
  request: Request,
  deps: {
    limitSignInAttempt: (request: Request, email: string) => Promise<{ ok: boolean }>
    comparePassword: (password: string, passwordHash: string) => boolean | Promise<boolean>
    findUserByEmail: (email: string) => Promise<CredentialsAuthUserRecord | null>
  }
): Promise<CredentialsAuthResult | 'rate_limited'> {
  const parsed = parseCredentials(credentials)
  if (!parsed) {
    return null
  }

  const { ok } = await deps.limitSignInAttempt(request, parsed.email)
  if (!ok) {
    return 'rate_limited'
  }

  return authorizeParsedCredentials(parsed, deps)
}
