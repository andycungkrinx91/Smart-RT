import { NextRequest, NextResponse } from 'next/server'

import { buildBackendHeaders, getBackendApiKey, getBackendBaseUrl } from '@/lib/backend'

export async function GET(_request: NextRequest, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params
  const baseUrl = getBackendBaseUrl()

  if (!getBackendApiKey()) {
    return NextResponse.json({ message: 'Server misconfigured: BACKEND_API_KEY is not set' }, { status: 500 })
  }

  const response = await fetch(`${baseUrl}/public/settings/${encodeURIComponent(key)}`, {
    method: 'GET',
    headers: buildBackendHeaders(),
    cache: 'no-store',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string; message?: string } | null
    const message = payload?.detail || payload?.message || 'Failed to fetch data'
    return NextResponse.json({ message }, { status: response.status })
  }

  const payload = (await response.json().catch(() => null)) as unknown
  return NextResponse.json(payload ?? { ok: true }, { status: response.status })
}
