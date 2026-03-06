import { NextResponse } from 'next/server'

type AladhanTimings = {
  Fajr?: string
  Sunrise?: string
  Dhuhr?: string
  Asr?: string
  Maghrib?: string
  Isha?: string
}

type AladhanResponse = {
  data?: {
    timings?: AladhanTimings
    date?: {
      gregorian?: { date?: string }
      hijri?: { date?: string }
    }
    meta?: {
      timezone?: string
      method?: { name?: string }
    }
  }
}

export async function GET() {
  const city = process.env.PRAYER_CITY || 'Jakarta'
  const country = process.env.PRAYER_COUNTRY || 'Indonesia'
  const method = process.env.PRAYER_METHOD || '20'
  const school = process.env.PRAYER_SCHOOL || '0'

  const url = new URL('https://api.aladhan.com/v1/timingsByCity')
  url.searchParams.set('city', city)
  url.searchParams.set('country', country)
  url.searchParams.set('method', method)
  url.searchParams.set('school', school)

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' },
      // Cache for 30 minutes; prayer times don't change frequently.
      next: { revalidate: 60 * 30 },
    })

    if (!response.ok) {
      return NextResponse.json({ message: 'Failed to fetch prayer times' }, { status: response.status })
    }

    const payload = (await response.json().catch(() => null)) as AladhanResponse | null
    const timings = payload?.data?.timings

    if (!timings) {
      return NextResponse.json({ message: 'Invalid prayer times response' }, { status: 502 })
    }

    return NextResponse.json({
      city,
      country,
      timezone: payload?.data?.meta?.timezone ?? 'Asia/Jakarta',
      method: payload?.data?.meta?.method?.name ?? null,
      date_gregorian: payload?.data?.date?.gregorian?.date ?? null,
      date_hijri: payload?.data?.date?.hijri?.date ?? null,
      timings: {
        fajr: timings.Fajr ?? null,
        sunrise: timings.Sunrise ?? null,
        dhuhr: timings.Dhuhr ?? null,
        asr: timings.Asr ?? null,
        maghrib: timings.Maghrib ?? null,
        isha: timings.Isha ?? null,
      },
    })
  } catch {
    return NextResponse.json({ message: 'Prayer time service unavailable' }, { status: 502 })
  }
}
