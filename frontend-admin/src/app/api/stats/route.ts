import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { getTokenFromRequest } from '@/lib/auth'

type ApiErrorBody = {
  detail?: string
  message?: string
}

type StatsPayload = {
  penduduk?: unknown
  kk?: unknown
  blogs?: unknown
}

function toCount(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value)
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed)
    }
  }

  return 0
}

async function parseErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as ApiErrorBody | null
  if (typeof payload?.detail === 'string') return payload.detail
  if (typeof payload?.message === 'string') return payload.message
  return `API error (${response.status})`
}

export async function GET(req: Request) {
  const token = getTokenFromRequest(req)
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  }

  try {
    const response = await fetch(`${env.API_BASE_URL}/stats`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
        'X-API-Key': env.BACKEND_API_KEY,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ message: await parseErrorMessage(response) }, { status: response.status })
    }

    const payload = (await response.json().catch(() => null)) as StatsPayload | null
    return NextResponse.json({
      penduduk: toCount(payload?.penduduk),
      kk: toCount(payload?.kk),
      blogs: toCount(payload?.blogs),
    })
  } catch {
    return NextResponse.json({ message: 'Backend tidak merespons' }, { status: 502 })
  }
}
