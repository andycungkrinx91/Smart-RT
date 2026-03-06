import { NextResponse } from 'next/server'

async function fetchKabkota(provinsi: string) {
  const endpoint = new URL('https://equran.id/api/v2/shalat/kabkota')
  endpoint.searchParams.set('provinsi', provinsi)

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
    next: { revalidate: 60 * 60 * 24 },
  })

  const payload = (await response.json().catch(() => null)) as unknown
  return { response, payload }
}

export async function GET(req: Request) {
  const provinsi = new URL(req.url).searchParams.get('provinsi')?.trim() || ''

  if (!provinsi) {
    return NextResponse.json({ message: 'provinsi is required' }, { status: 400 })
  }

  try {
    const { response, payload } = await fetchKabkota(provinsi)
    if (!response.ok) {
      return NextResponse.json({ message: 'Failed to fetch cities' }, { status: response.status })
    }

    const out = NextResponse.json(payload)
    out.headers.set('cache-control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400')
    return out
  } catch {
    return NextResponse.json({ message: 'Prayer schedule service unavailable' }, { status: 502 })
  }
}
