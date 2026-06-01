import type { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/auth'
import { Err } from './response'

type RouteContext = { params: Promise<Record<string, string>> }
type AuthedHandler = (req: NextRequest, ctx: RouteContext, userId: string) => Promise<Response>

export function withAuth(handler: AuthedHandler) {
  return async (req: NextRequest, ctx: RouteContext): Promise<Response> => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return Err.unauthorized()
    return handler(req, ctx, session.user.id)
  }
}
