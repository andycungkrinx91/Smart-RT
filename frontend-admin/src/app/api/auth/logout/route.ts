import { NextResponse } from 'next/server'
import { env, isAllowedOrigin } from '@/lib/env'

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ message: 'Origin tidak valid' }, { status: 403 })
  }

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  if (token) {
    try {
      await fetch(`${env.API_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/json',
          'X-API-Key': env.BACKEND_API_KEY,
        },
        cache: 'no-store',
      })
    } catch (err) {
      console.error('Logout backend failed:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
