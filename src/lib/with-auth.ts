import type { NextRequest } from 'next/server'
import { auth } from './auth'
import { Err } from './response'

type RouteContext = { params: Promise<Record<string, string>> }
type AuthedHandler = (req: NextRequest, ctx: RouteContext, userId: string) => Promise<Response>

/**
 * Wraps a Route Handler with session validation.
 * Injects the authenticated userId as the third argument.
 */
export function withAuth(handler: AuthedHandler) {
  return async (req: NextRequest, ctx: RouteContext): Promise<Response> => {
    const session = await auth()
    if (!session?.user?.id) return Err.unauthorized()
    return handler(req, ctx, session.user.id)
  }
}
