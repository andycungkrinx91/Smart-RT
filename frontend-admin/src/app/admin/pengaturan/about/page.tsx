'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { fetchWithAuth } from '@/lib/client-api'

type SettingPayload = {
  key: string
  value: Record<string, unknown> | null
}

const defaultAboutState = {
  vision: '',
  mission: '',
  story: '',
}

export default function AboutPengaturanPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [about, setAbout] = useState(defaultAboutState)

  useEffect(() => {
    let isMounted = true

    async function fetchSetting(key: string): Promise<SettingPayload> {
      const response = await fetchWithAuth(`/api/settings/${key}`, { method: 'GET', cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
      if (!response.ok) {
        const message = payload?.message ? String(payload.message) : `Tidak dapat memuat ${key}`
        throw new Error(message)
      }
      const normalized: SettingPayload | null = payload && typeof payload === 'object' && 'key' in payload && 'value' in payload
        ? (payload as SettingPayload)
        : null
      return normalized ?? { key, value: null }
    }

    async function load() {
      try {
        const aboutPayload = await fetchSetting('page_about')

        if (!isMounted) return

        const aboutValue = (aboutPayload.value ?? {}) as Record<string, unknown>
        setAbout({
          vision: typeof aboutValue.vision === 'string' ? aboutValue.vision : '',
          mission: typeof aboutValue.mission === 'string' ? aboutValue.mission : '',
          story: typeof aboutValue.story === 'string' ? aboutValue.story : '',
        })

        setStatus(null)
      } catch (error) {
        if (!isMounted) return
        setStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat konten tentang.',
        })
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  const handleChange = (field: keyof typeof defaultAboutState, value: string) => {
    setAbout((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setStatus(null)
    setSaving(true)
    try {
      const payload: SettingPayload = {
        key: 'page_about',
        value: {
          vision: about.vision,
          mission: about.mission,
          story: about.story,
        },
      }

      const response = await fetchWithAuth('/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as Record<string, unknown> | null
        const message = error?.message ? String(error.message) : 'Gagal menyimpan perubahan.'
        throw new Error(message)
      }

      setStatus({ type: 'success', message: 'Konten halaman tentang tersimpan.' })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Pengaturan</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Halaman Tentang</h1>
        <p className="text-sm text-slate-500 max-w-3xl">
          Kelola visi, misi, dan cerita utama agar halaman tentang selalu sejalan dengan identitas Smart RT.
        </p>
      </header>

      <section className="card p-6 space-y-6">
        <div className="grid gap-4">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Cerita singkat
            <textarea
              value={about.story}
              onChange={(event) => handleChange('story', event.target.value)}
              rows={4}
              className="input-field resize-none text-sm leading-relaxed"
              placeholder="Ceritakan latar belakang dan tujuan Smart RT."
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Visi
            <textarea
              value={about.vision}
              onChange={(event) => handleChange('vision', event.target.value)}
              rows={3}
              className="input-field resize-none text-sm leading-relaxed"
              placeholder="Rangkai visi utama organisasi."
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Misi
            <textarea
              value={about.mission}
              onChange={(event) => handleChange('mission', event.target.value)}
              rows={4}
              className="input-field resize-none text-sm leading-relaxed"
              placeholder="Tulis misi atau fokus utama yang ingin dicapai."
            />
          </label>
        </div>
      </section>

      {status ? (
        <div
          className={`rounded-corporate border px-4 py-3 text-sm font-semibold ${
            status.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-100 bg-emerald-50 text-emerald-700'
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Perubahan disimpan aman via API</p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-corporate bg-gradient-to-r from-primary to-brand-accent px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Simpan perubahan
        </button>
      </div>
    </div>
  )
}
