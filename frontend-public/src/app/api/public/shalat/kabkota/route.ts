import { NextResponse } from 'next/server'

const TIMEOUT_MS = 5000

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(req: Request) {
  const provinsi = new URL(req.url).searchParams.get('provinsi')?.trim() || ''
  if (!provinsi) {
    return NextResponse.json({ code: 0, message: 'provinsi required', data: [] }, { status: 400 })
  }

  try {
    const response = await fetchWithTimeout('https://equran.id/api/v2/shalat/kabkota', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ provinsi }),
      next: { revalidate: 86400 },
    })

    const payload = (await response.json().catch(() => null)) as unknown
    if (!response.ok) {
      return NextResponse.json({ code: 0, message: 'Failed to load cities', data: [] }, { status: response.status })
    }
    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ code: 0, message: 'Service unavailable', data: [] }, { status: 502 })
  }
}
