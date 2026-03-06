import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { getTokenFromRequest } from '@/lib/auth'

type ApiErrorBody = {
  detail?: string
  message?: string
}

async function parseErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as ApiErrorBody | null
  if (typeof payload?.detail === 'string') return payload.detail
  if (typeof payload?.message === 'string') return payload.message
  return `API error (${response.status})`
}

function unauthorizedResponse() {
  return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
}

async function proxyRequest(path: string, init: RequestInit, token: string) {
  const response = await fetch(`${env.API_BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'X-API-Key': env.BACKEND_API_KEY,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return NextResponse.json({ message: await parseErrorMessage(response) }, { status: response.status })
  }

  const payload = (await response.json().catch(() => null)) as unknown
  return NextResponse.json(payload ?? { ok: true }, { status: response.status })
}

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request)
  if (!token) return unauthorizedResponse()

  const searchParams = request.nextUrl.searchParams.toString()
  const path = '/datakeuanganrt' + (searchParams ? '?' + searchParams : '')
  return proxyRequest(path, { method: 'GET' }, token)
}

export async function POST(request: Request) {
  const token = getTokenFromRequest(request)
  if (!token) return unauthorizedResponse()

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) {
    return NextResponse.json({ message: 'Payload tidak valid' }, { status: 400 })
  }

  return proxyRequest('/adddatakeuanganrt', { method: 'POST', body: JSON.stringify(body) }, token)
}

export async function PUT(request: Request) {
  const token = getTokenFromRequest(request)
  if (!token) return unauthorizedResponse()

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) {
    return NextResponse.json({ message: 'Payload tidak valid' }, { status: 400 })
  }

  return proxyRequest('/updatedatakeuanganrt', { method: 'PUT', body: JSON.stringify(body) }, token)
}

export async function DELETE(request: NextRequest) {
  const token = getTokenFromRequest(request)
  if (!token) return unauthorizedResponse()

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ message: 'Parameter id wajib diisi' }, { status: 400 })
  }

  return proxyRequest(`/deletedatakeuanganrt?id=${id}`, { method: 'DELETE' }, token)
}
