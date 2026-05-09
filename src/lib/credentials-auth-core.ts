import { normalizeEmailAddress } from './email'

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

export async function authorizeCredentialsWithDeps(
  credentials: Partial<Record<'email' | 'password', unknown>> | undefined,
  deps: {
    comparePassword: (password: string, passwordHash: string) => boolean | Promise<boolean>
    findUserByEmail: (email: string) => Promise<CredentialsAuthUserRecord | null>
  }
): Promise<CredentialsAuthResult> {
  const email = typeof credentials?.email === 'string'
    ? normalizeEmailAddress(credentials.email)
    : ''
  const password = typeof credentials?.password === 'string'
    ? credentials.password
    : ''

  if (!email || !password) {
    return null
  }

  const user = await deps.findUserByEmail(email)
  if (!user) {
    return null
  }

  if (!user.passwordHash) {
    return 'oauth_only'
  }

  const valid = await deps.comparePassword(password, user.passwordHash)
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
