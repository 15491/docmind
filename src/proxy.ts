import { type NextRequest, NextResponse } from 'next/server'

// Better Auth 默认 session cookie 名称
const SESSION_COOKIE = 'better-auth.session_token'

// 公开 API 路径（无需登录）
const PUBLIC_API_PREFIXES = ['/api/auth', '/api/health', '/api/register']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hasSession = req.cookies.has(SESSION_COOKIE)

  if (pathname.startsWith('/api/')) {
    const isPublic = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    if (!isPublic && !hasSession) {
      return NextResponse.json(
        { ok: false, code: 'UNAUTHORIZED', message: '未登录或登录已过期' },
        { status: 401 }
      )
    }
    return
  }

  if (pathname.startsWith('/dashboard') && !hasSession) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (
    (pathname === '/login' || pathname === '/register' || pathname === '/reset-password')
    && hasSession
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
