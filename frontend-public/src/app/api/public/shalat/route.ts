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

function getSafePeriod(bulanRaw: unknown, tahunRaw: unknown) {
  const bulan = Number(bulanRaw)
  const tahun = Number(tahunRaw)
  const now = new Date()
  const safeBulan = Number.isFinite(bulan) && bulan >= 1 && bulan <= 12 ? bulan : now.getMonth() + 1
  const safeTahun = Number.isFinite(tahun) && tahun >= 2000 && tahun <= 2100 ? tahun : now.getFullYear()
  return { safeBulan, safeTahun }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const provinsi = url.searchParams.get('provinsi')?.trim() || ''
  const kabkota = url.searchParams.get('kabkota')?.trim() || ''
  const bulan = url.searchParams.get('bulan')
  const tahun = url.searchParams.get('tahun')

  if (!provinsi || !kabkota) {
    return NextResponse.json({ code: 0, message: 'provinsi and kabkota required', data: null }, { status: 400 })
  }

  try {
    const { safeBulan, safeTahun } = getSafePeriod(bulan, tahun)
    const response = await fetchWithTimeout('https://equran.id/api/v2/shalat', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ provinsi, kabkota, bulan: safeBulan, tahun: safeTahun }),
      next: { revalidate: 21600 },
    })

    const payload = (await response.json().catch(() => null)) as unknown
    if (!response.ok) {
      return NextResponse.json({ code: 0, message: 'Failed to load schedule', data: null }, { status: response.status })
    }
    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ code: 0, message: 'Service unavailable', data: null }, { status: 502 })
  }
}
