import { NextResponse } from 'next/server'
import { env, isAllowedOrigin } from '@/lib/env'
import { getTokenFromRequest } from '@/lib/auth'

type RouteParams = {
  params: Promise<{ key?: string[] }>
}

function buildHeaders(token: string, withJson = false): HeadersInit {
  const headers: HeadersInit = {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
    'X-API-Key': env.BACKEND_API_KEY,
  }
  if (withJson) {
    headers['content-type'] = 'application/json'
  }
  return headers
}

async function callBackend(path: string, init: RequestInit) {
  const response = await fetch(`${env.API_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => null)) as unknown
  return { response, payload }
}

export async function GET(request: Request, { params }: RouteParams) {
  const token = getTokenFromRequest(request)
  if (!token) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

  const { key } = await params
  const keyParam = key?.[0]

  if (!keyParam) {
    return NextResponse.json({ message: 'Missing setting key' }, { status: 400 })
  }

  try {
    const { response, payload } = await callBackend(`/settings/${keyParam}`, {
      method: 'GET',
      headers: buildHeaders(token),
    })
    return NextResponse.json(payload, { status: response.status })
  } catch {
    return NextResponse.json({ message: 'Backend tidak merespons' }, { status: 502 })
  }
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) return NextResponse.json({ message: 'Origin tidak valid' }, { status: 403 })
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

  try {
    const body = await req.json()
    const { response, payload } = await callBackend('/settings', {
      method: 'POST',
      headers: buildHeaders(token, true),
      body: JSON.stringify(body),
    })
    return NextResponse.json(payload, { status: response.status })
  } catch {
    return NextResponse.json({ message: 'Backend tidak merespons' }, { status: 502 })
  }
}
