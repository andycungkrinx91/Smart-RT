import { NextResponse } from 'next/server'
import { env, getSiteUrlFromRequest, isAllowedOrigin } from '@/lib/env'

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) {
    const origin = req.headers.get('origin')
    const expected = getSiteUrlFromRequest(req)
    console.error(`CSRF Mismatch: Origin=${origin}, Expected=${expected}`)
    return NextResponse.json({
      message: 'Origin tidak valid (CSRF).',
      debug: { origin, expected },
    }, { status: 403 })
  }

  const json = (await req.json().catch(() => null)) as any
  const email = typeof json?.email === 'string' ? json.email : ''
  const password = typeof json?.password === 'string' ? json.password : ''
  if (!email.includes('@') || password.length < 1) {
    return NextResponse.json({ message: 'Input tidak valid' }, { status: 400 })
  }

  const r = await fetch(`${env.API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'X-API-Key': env.BACKEND_API_KEY,
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  if (!r.ok) {
    return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 })
  }

  const data = (await r.json()) as { access_token: string }
  return NextResponse.json({ ok: true, token: data.access_token })
}
