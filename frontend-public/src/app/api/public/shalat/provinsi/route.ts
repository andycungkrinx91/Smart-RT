import { NextResponse } from 'next/server'

type ProvinsiResponse = { code?: number; message?: string; data?: unknown }

export async function GET() {
  try {
    const response = await fetch('https://equran.id/api/v2/shalat/provinsi', {
      method: 'GET',
      headers: { accept: 'application/json' },
      next: { revalidate: 60 * 60 * 24 },
    })

    const payload = (await response.json().catch(() => null)) as ProvinsiResponse | null

    if (!response.ok) {
      return NextResponse.json({ message: payload?.message || 'Failed to fetch provinces' }, { status: response.status })
    }

    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ message: 'Prayer schedule service unavailable' }, { status: 502 })
  }
}
