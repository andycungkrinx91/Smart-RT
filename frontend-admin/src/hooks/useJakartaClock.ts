'use client'

/**
 * useJakartaClock.ts
 *
 * Returns the current time in WIB (Asia/Jakarta, UTC+7) updated every second.
 * Also exposes a formatted object so components don't need to format themselves.
 */

import { useState, useEffect } from 'react'

export type JakartaTime = {
  /** Full Date object in Jakarta timezone */
  date: Date
  /** "HH" zero-padded */
  hours: string
  /** "MM" zero-padded */
  minutes: string
  /** "SS" zero-padded */
  seconds: string
  /** "Senin, 26 Februari 2026" in Indonesian */
  dateLabel: string
  /** "WIB" */
  timezone: string
  /** Whether it's AM or PM (24-h aware) */
  period: 'AM' | 'PM'
}

const JAKARTA_TZ = 'Asia/Jakarta'

const ID_WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function getJakartaTime(): JakartaTime {
  // Convert current UTC instant to Jakarta locale string, then re-parse.
  const now = new Date()

  // Use Intl to extract individual parts reliably
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: JAKARTA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((p) => [p.type, p.value]),
  )

  const h = parts['hour'] ?? '00'
  const m = parts['minute'] ?? '00'
  const s = parts['second'] ?? '00'

  const dayIdx = ID_WEEKDAYS.findIndex(
    (d) => d.toLowerCase().startsWith(parts['weekday']?.toLowerCase().slice(0, 3) ?? ''),
  )
  const monthIdx = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: JAKARTA_TZ, month: '2-digit' }).format(now),
  ) - 1

  const dayNum = parts['day'] ?? '1'
  const yearNum = parts['year'] ?? '2026'

  const weekdayLabel = dayIdx >= 0 ? ID_WEEKDAYS[dayIdx] : parts['weekday'] ?? ''
  const monthLabel = ID_MONTHS[monthIdx] ?? ''

  return {
    date: now,
    hours: h === '24' ? '00' : h,
    minutes: m,
    seconds: s,
    dateLabel: `${weekdayLabel}, ${dayNum} ${monthLabel} ${yearNum}`,
    timezone: 'WIB',
    period: Number(h) < 12 ? 'AM' : 'PM',
  }
}

export function useJakartaClock(): JakartaTime {
  const [time, setTime] = useState<JakartaTime>(getJakartaTime)

  useEffect(() => {
    const id = setInterval(() => {
      setTime(getJakartaTime())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return time
}
