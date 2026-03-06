import { NextResponse } from 'next/server'

import { getBackendApiKey, getBackendBaseUrl, getOrLoginBackendBearerToken } from '@/lib/backend'

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const baseUrl = getBackendBaseUrl()

  if (!getBackendApiKey()) {
    return NextResponse.json({ message: 'Server misconfigured: BACKEND_API_KEY is not set' }, { status: 500 })
  }

  const bearer = await getOrLoginBackendBearerToken(baseUrl)
  if (!bearer) {
    return NextResponse.json(
      {
        message:
          'Server misconfigured: set BACKEND_PUBLIC_BEARER_TOKEN or BACKEND_PUBLIC_EMAIL/BACKEND_PUBLIC_PASSWORD in frontend-public env',
      },
      { status: 500 },
    )
  }

  try {
    // Use dedicated blog detail endpoint
    const response = await fetch(`${baseUrl}/blogs/${id}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${bearer}`,
        ...(getBackendApiKey() ? { 'X-API-Key': getBackendApiKey() } : {}),
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as unknown
      const message =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? String((payload as { message?: unknown }).message)
          : 'Failed to fetch blog'

      return NextResponse.json({ message }, { status: response.status })
    }

    const blog = await response.json()
    return NextResponse.json(blog)
  } catch {
    return NextResponse.json({ message: 'Backend tidak merespons' }, { status: 502 })
  }
}
