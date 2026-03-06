import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSiteUrlFromRequest, getTenantFromRequest } from '@/lib/env'

const SESSION_COOKIE_NAME = 'srt_session'

export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === '/') {
    const hasSession = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value)
    const redirectUrl = new URL(hasSession ? '/admin' : '/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  const requestHeaders = new Headers(req.headers)
  const tenant = getTenantFromRequest({ headers: requestHeaders })

  if (tenant) {
    requestHeaders.set('x-tenant', tenant)
  } else {
    requestHeaders.delete('x-tenant')
  }

  requestHeaders.set('x-site-url', getSiteUrlFromRequest({ headers: requestHeaders }))

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
