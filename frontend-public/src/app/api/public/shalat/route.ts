import { NextResponse } from 'next/server'

function getSafePeriod(bulanRaw: unknown, tahunRaw: unknown) {
  const bulan = Number(bulanRaw)
  const tahun = Number(tahunRaw)
  const now = new Date()
  const safeBulan = Number.isFinite(bulan) && bulan >= 1 && bulan <= 12 ? bulan : now.getMonth() + 1
  const safeTahun = Number.isFinite(tahun) && tahun >= 2000 && tahun <= 2100 ? tahun : now.getFullYear()
  return { safeBulan, safeTahun }
}

async function fetchSchedule(provinsi: string, kabkota: string, bulanRaw: unknown, tahunRaw: unknown) {
  const { safeBulan, safeTahun } = getSafePeriod(bulanRaw, tahunRaw)
  const endpoint = new URL('https://equran.id/api/v2/shalat')
  endpoint.searchParams.set('provinsi', provinsi)
  endpoint.searchParams.set('kabkota', kabkota)
  endpoint.searchParams.set('bulan', String(safeBulan))
  endpoint.searchParams.set('tahun', String(safeTahun))

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
    next: { revalidate: 60 * 60 * 6 },
  })

  const payload = (await response.json().catch(() => null)) as unknown
  return { response, payload, safeBulan, safeTahun }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const provinsi = url.searchParams.get('provinsi')?.trim() || ''
  const kabkota = url.searchParams.get('kabkota')?.trim() || ''
  const bulan = url.searchParams.get('bulan')
  const tahun = url.searchParams.get('tahun')

  if (!provinsi || !kabkota) {
    return NextResponse.json({ message: 'provinsi and kabkota are required' }, { status: 400 })
  }

  try {
    const { response, payload } = await fetchSchedule(provinsi, kabkota, bulan, tahun)
    if (!response.ok) {
      return NextResponse.json({ message: 'Failed to fetch schedule' }, { status: response.status })
    }

    const out = NextResponse.json(payload)
    out.headers.set('cache-control', 'public, max-age=0, s-maxage=21600, stale-while-revalidate=21600')
    return out
  } catch {
    return NextResponse.json({ message: 'Prayer schedule service unavailable' }, { status: 502 })
  }
}
