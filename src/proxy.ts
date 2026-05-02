import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl
  const userId = req.auth?.user?.id

  if (pathname.startsWith('/dashboard') && !userId) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (
    (pathname === '/login' || pathname === '/register' || pathname === '/reset-password')
    && userId
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
