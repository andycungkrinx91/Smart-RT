import { NextResponse } from 'next/server'

import { getBackendApiKey, getBackendBaseUrl, getOrLoginBackendBearerToken } from '@/lib/backend'

async function tryFetch(url: string) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => null)) as unknown
  return { response, payload }
}

export async function GET() {
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
    // Backend has only /blogs (protected). Call server-side with service Bearer.
    const result = await fetch(`${baseUrl}/blogs`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${bearer}`,
        ...(getBackendApiKey() ? { 'X-API-Key': getBackendApiKey() } : {}),
      },
      cache: 'no-store',
    }).then(async (response) => {
      const payload = (await response.json().catch(() => null)) as unknown
      return { response, payload }
    })

    if (result.response.ok) return NextResponse.json(result.payload)

    const message =
      typeof result.payload === 'object' && result.payload !== null && 'message' in result.payload
        ? String((result.payload as { message?: unknown }).message)
        : 'Failed to fetch blogs'

    return NextResponse.json({ message }, { status: result.response.status })
  } catch {
    return NextResponse.json({ message: 'Backend tidak merespons' }, { status: 502 })
  }
}
