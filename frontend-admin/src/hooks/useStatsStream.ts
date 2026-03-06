'use client'

/**
 * useStatsStream
 *
 * Opens an EventSource to /api/stats/stream and keeps the stats state
 * up-to-date in real time.  The hook handles:
 *
 *  - Initial loading state while waiting for the first event
 *  - Exponential-backoff reconnection on error (capped at 30 s)
 *  - Proper cleanup (EventSource.close) on unmount
 *  - Auth redirect: if the proxy returns 401 the browser navigates to /login
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { toUserFriendlyMessage } from '@/lib/user-friendly-error'

export type StatsKey =
  | 'penduduk'
  | 'kk'
  | 'blogs'
  | 'total_pemasukan'
  | 'total_pengeluaran'
  | 'total_tunggakan'
  | 'pemasukan_bulan_ini'
  | 'pengeluaran_bulan_ini'
  | 'tunggakan_bulan_ini'
  | 'pemasukan_tahun_ini'
  | 'pengeluaran_tahun_ini'
  | 'tunggakan_tahun_ini'
  | 'iuran_lunas_bulan_ini'
  | 'iuran_belum_lunas_bulan_ini'
  | 'iuran_total_bulan_ini'
  | 'iuran_lunas_tahun_ini'
  | 'iuran_belum_lunas_tahun_ini'
  | 'iuran_total_tahun_ini'
export type StatsData = Record<StatsKey, number>

type UseStatsStreamResult = {
  stats: StatsData
  isLoading: boolean
  errorMessage: string
  /** Call to force an immediate reconnect after a fatal error. */
  reconnect: () => void
}

const STREAM_PATH = '/api/stats/stream'
const TOKEN_KEY = 'srt_access_token'
const INITIAL_STATS: StatsData = {
  penduduk: 0,
  kk: 0,
  blogs: 0,
  total_pemasukan: 0,
  total_pengeluaran: 0,
  total_tunggakan: 0,
  pemasukan_bulan_ini: 0,
  pengeluaran_bulan_ini: 0,
  tunggakan_bulan_ini: 0,
  pemasukan_tahun_ini: 0,
  pengeluaran_tahun_ini: 0,
  tunggakan_tahun_ini: 0,
  iuran_lunas_bulan_ini: 0,
  iuran_belum_lunas_bulan_ini: 0,
  iuran_total_bulan_ini: 0,
  iuran_lunas_tahun_ini: 0,
  iuran_belum_lunas_tahun_ini: 0,
  iuran_total_tahun_ini: 0,
}

/** Read the JWT from localStorage (same key used by client-api.ts). */
function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/** Build the EventSource URL with the auth token as a query parameter.
 *  EventSource does not support custom headers in browsers, so we pass the
 *  token via ?token= and the Next.js proxy reads it from there.
 */
function buildStreamUrl(): string {
  const token = getStoredToken()
  if (!token) return STREAM_PATH
  return `${STREAM_PATH}?token=${encodeURIComponent(token)}`
}

function toCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value)
  }
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n) && n >= 0) return Math.trunc(n)
  }
  return 0
}

export function useStatsStream(): UseStatsStreamResult {
  const [stats, setStats] = useState<StatsData>(INITIAL_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // Reconnect token: incrementing it triggers the effect to re-run.
  const [reconnectToken, setReconnectToken] = useState(0)

  // Mutable ref so the cleanup closure always has the latest handle.
  const esRef = useRef<EventSource | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelayRef = useRef(2_000) // start at 2 s

  const reconnect = useCallback(() => {
    retryDelayRef.current = 2_000 // reset backoff
    setReconnectToken((t) => t + 1)
  }, [])

  useEffect(() => {
    // Clean up any previous connection/timer before opening a new one.
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }

    // Use a microtask or timeout to avoid synchronous setState in effect
    const initTimer = setTimeout(() => {
      setIsLoading(true)
      setErrorMessage('')
    }, 0)

    const streamUrl = buildStreamUrl()

    // If there is no token at all, we cannot stream – surface an error and
    // let the user navigate away (the layout's auth guard will redirect).
    if (streamUrl === STREAM_PATH && !getStoredToken()) {
      const errorTimer = setTimeout(() => {
        setErrorMessage('Sesi tidak ditemukan. Silakan login kembali.')
        setIsLoading(false)
      }, 0)
      return () => clearTimeout(errorTimer)
    }

    const es = new EventSource(streamUrl)
    esRef.current = es

    // ── Successful data event ─────────────────────────────────────────────
    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as Partial<Record<StatsKey, unknown>>
        setStats({
          penduduk: toCount(payload.penduduk),
          kk: toCount(payload.kk),
          blogs: toCount(payload.blogs),
          total_pemasukan: toCount(payload.total_pemasukan),
          total_pengeluaran: toCount(payload.total_pengeluaran),
          total_tunggakan: toCount(payload.total_tunggakan),
          pemasukan_bulan_ini: toCount(payload.pemasukan_bulan_ini),
          pengeluaran_bulan_ini: toCount(payload.pengeluaran_bulan_ini),
          tunggakan_bulan_ini: toCount(payload.tunggakan_bulan_ini),
          pemasukan_tahun_ini: toCount(payload.pemasukan_tahun_ini),
          pengeluaran_tahun_ini: toCount(payload.pengeluaran_tahun_ini),
          tunggakan_tahun_ini: toCount(payload.tunggakan_tahun_ini),
          iuran_lunas_bulan_ini: toCount(payload.iuran_lunas_bulan_ini),
          iuran_belum_lunas_bulan_ini: toCount(payload.iuran_belum_lunas_bulan_ini),
          iuran_total_bulan_ini: toCount(payload.iuran_total_bulan_ini),
          iuran_lunas_tahun_ini: toCount(payload.iuran_lunas_tahun_ini),
          iuran_belum_lunas_tahun_ini: toCount(payload.iuran_belum_lunas_tahun_ini),
          iuran_total_tahun_ini: toCount(payload.iuran_total_tahun_ini),
        })
        setErrorMessage('')
        retryDelayRef.current = 2_000 // reset backoff on success
      } catch {
        // Malformed JSON: ignore this event, keep connection open.
      }
      setIsLoading(false)
    }

    // ── Named "error" event from backend (fatal stream error) ─────────────
    es.addEventListener('error', (event: Event) => {
      // Named SSE "error" events carry a MessageEvent payload.
      if (event instanceof MessageEvent) {
        let msg = 'Maaf, statistik dashboard sedang terkendala.'
        try {
          const payload = JSON.parse(event.data as string) as { message?: string; detail?: string }
          msg = toUserFriendlyMessage(payload.message ?? payload.detail, msg)
        } catch {
          // ignore
        }
        es.close()
        esRef.current = null
        setErrorMessage(msg)
        setIsLoading(false)
        scheduleRetry()
        return
      }

      // Generic EventSource error (network drop, 401, etc.)
      const readyState = (event.target as EventSource).readyState
      if (readyState === EventSource.CLOSED) {
        // EventSource will NOT reconnect automatically when closed – we do it.
        setErrorMessage('Koneksi terputus. Mencoba kembali…')
        setIsLoading(false)
        scheduleRetry()
      }
      // readyState === CONNECTING means the browser is already retrying.
    })

    function scheduleRetry() {
      const delay = retryDelayRef.current
      // Exponential backoff, capped at 30 s.
      retryDelayRef.current = Math.min(delay * 2, 30_000)

      retryTimerRef.current = setTimeout(() => {
        setReconnectToken((t) => t + 1)
      }, delay)
    }

    return () => {
      clearTimeout(initTimer)
      es.close()
      esRef.current = null
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
    }
  }, [reconnectToken])

  return { stats, isLoading, errorMessage, reconnect }
}
