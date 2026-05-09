import type { NextAuthConfig, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

type AuthCallbacks = NonNullable<NextAuthConfig['callbacks']>

interface SessionVersionDeps {
  createSessionVersion: (userId: string) => Promise<string>
  getSessionVersion: (userId: string) => Promise<string | null>
}

export async function syncSessionVersionToken(
  token: JWT,
  user: { id?: string | null } | undefined,
  deps: SessionVersionDeps
): Promise<JWT> {
  if (user?.id) {
    token.sub = user.id
    token.sessionVersion = await deps.createSessionVersion(user.id)
    return token
  }

  if (token.sub && token.sessionVersion) {
    const current = await deps.getSessionVersion(token.sub)
    if (current !== token.sessionVersion) {
      return { ...token, sub: undefined, sessionVersion: undefined }
    }
  }

  return token
}

export function hydrateSessionUser(session: Session, token: JWT): Session {
  if (token.sub) {
    ;(session.user as Session['user'] & { id?: string }).id = token.sub
  } else {
    session.user = {} as Session['user']
  }

  return session
}

export const authCallbacks: Pick<AuthCallbacks, 'jwt' | 'session'> = {
  async jwt({ token, user }) {
    const { createSessionVersion, getSessionVersion } = await import('./session-version')
    return syncSessionVersionToken(token, user, {
      createSessionVersion: (userId) => createSessionVersion(userId),
      getSessionVersion: (userId) => getSessionVersion(userId),
    })
  },
  session({ session, token }) {
    return hydrateSessionUser(session, token)
  },
}
