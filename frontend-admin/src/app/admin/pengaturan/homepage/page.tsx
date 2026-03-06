'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Calendar,
  Check,
  Globe,
  Home,
  Loader2,
  Lock,
  Newspaper,
  Plus,
  Shield,
  Trash,
  Users,
  Zap,
  Info,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/client-api'

const iconRegistry = {
  Shield,
  Users,
  BarChart3,
  Calendar,
  Zap,
  Globe,
  Lock,
} as const

type IconName = keyof typeof iconRegistry
const ICON_OPTIONS: { value: IconName; label: string }[] = [
  { value: 'Shield', label: 'Perlindungan & Keamanan' },
  { value: 'Users', label: 'Kelola Warga' },
  { value: 'BarChart3', label: 'Laporan & Insight' },
  { value: 'Calendar', label: 'Jadwal & Agenda' },
  { value: 'Zap', label: 'Automasi & Notifikasi' },
  { value: 'Globe', label: 'Komunitas & Kolaborasi' },
  { value: 'Lock', label: 'Privasi & Kepatuhan' },
]

type FeatureDraft = {
  id: string
  title: string
  description: string
  icon: IconName
}

type LayoutNavigationValue = {
  brand?: {
    name?: string
    tagline?: string
  }
  primary?: Array<{ label?: string; href?: string }>
  secondary?: Array<{ label?: string; href?: string; icon?: BottomNavIcon }>
}

type LayoutGlobalValue = {
  footer?: {
    description?: string
  }
  contact?: {
    email?: string
    phone?: string
    address?: string
  }
}

type NavigationLinkDraft = {
  id: string
  label: string
  href: string
  icon?: BottomNavIcon
}

type BottomNavIcon = 'Home' | 'Newspaper' | 'Info' | 'Zap'

const DEFAULT_PRIMARY_NAV = [
  { label: 'Beranda', href: '/' },
  { label: 'Blog', href: '/blogs' },
  { label: 'Tentang Kami', href: '/about' },
]

const DEFAULT_SECONDARY_NAV: Array<{ label: string; href: string; icon: BottomNavIcon }> = [
  { label: 'Beranda', href: '/', icon: 'Home' },
  { label: 'Blog', href: '/blogs', icon: 'Newspaper' },
  { label: 'Tentang', href: '/about', icon: 'Info' },
]

const DEFAULT_BRAND_NAME = 'Smart RT'
const DEFAULT_BRAND_TAGLINE = 'Solusi digital manajemen lingkungan yang transparan.'
const DEFAULT_FOOTER_DESCRIPTION = 'Solusi digital generasi baru untuk manajemen lingkungan yang transparan dan aman.'
const DEFAULT_CONTACT = {
  email: 'support@smartrt.id',
  phone: '+62 812 3456 7890',
  address: 'Jakarta, Indonesia',
}

const BOTTOM_NAV_ICON_OPTIONS: Array<{ label: string; value: BottomNavIcon }> = [
  { label: 'Beranda', value: 'Home' },
  { label: 'Blog', value: 'Newspaper' },
  { label: 'Tentang', value: 'Info' },
  { label: 'Aksi', value: 'Zap' },
]

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createFeatureDraft(overrides: Partial<Omit<FeatureDraft, 'id'>> = {}): FeatureDraft {
  return {
    id: createId(),
    title: '',
    description: '',
    icon: 'Shield',
    ...overrides,
  }
}

function createNavigationDraft(overrides: Partial<Omit<NavigationLinkDraft, 'id'>> = {}): NavigationLinkDraft {
  return {
    id: createId(),
    label: '',
    href: '',
    icon: overrides.icon ?? 'Home',
    ...overrides,
  }
}

type SettingPayload = {
  key: string
  value: Record<string, unknown> | null
}

const defaultHeroState = { title: '', subtitle: '' }

export default function HomepagePengaturanPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [hero, setHero] = useState(defaultHeroState)
  const [features, setFeatures] = useState<FeatureDraft[]>(() => [createFeatureDraft()])
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME)
  const [brandTagline, setBrandTagline] = useState(DEFAULT_BRAND_TAGLINE)
  const [primaryNav, setPrimaryNav] = useState(() => DEFAULT_PRIMARY_NAV.map((item) => createNavigationDraft(item)))
  const [secondaryNav, setSecondaryNav] = useState(() =>
    DEFAULT_SECONDARY_NAV.map((item) => createNavigationDraft(item))
  )
  const [footerDescription, setFooterDescription] = useState(DEFAULT_FOOTER_DESCRIPTION)
  const [contactEmail, setContactEmail] = useState(DEFAULT_CONTACT.email)
  const [contactPhone, setContactPhone] = useState(DEFAULT_CONTACT.phone)
  const [contactAddress, setContactAddress] = useState(DEFAULT_CONTACT.address)

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
        const [homePayload, navigationPayload, globalPayload] = await Promise.all([
          fetchSetting('page_home'),
          fetchSetting('layout_navigation'),
          fetchSetting('layout_global'),
        ])

        if (!isMounted) return

        const homeValue = (homePayload.value ?? {}) as Record<string, unknown>
        const heroValue = (homeValue.hero ?? {}) as Record<string, unknown>
        setHero({
          title: typeof heroValue.title === 'string' ? heroValue.title : '',
          subtitle: typeof heroValue.subtitle === 'string' ? heroValue.subtitle : '',
        })

        const rawFeatures = Array.isArray(homeValue.features) ? homeValue.features : []
        const normalizedFeatures =
          rawFeatures.length > 0
            ? rawFeatures.map((feature) =>
                createFeatureDraft({
                  title: typeof feature?.title === 'string' ? feature.title : '',
                  description: typeof feature?.description === 'string' ? feature.description : '',
                  icon: typeof feature?.icon === 'string' && feature.icon in iconRegistry ? (feature.icon as IconName) : 'Shield',
                })
              )
            : [createFeatureDraft()]
        setFeatures(normalizedFeatures)

        const navigationValue = (navigationPayload.value ?? {}) as LayoutNavigationValue
        const primaryValue = Array.isArray(navigationValue.primary) ? navigationValue.primary : []
        const trimmedPrimary = primaryValue
          .map((item) =>
            createNavigationDraft({
              label: typeof item?.label === 'string' ? item.label : '',
              href: typeof item?.href === 'string' ? item.href : '',
            })
          )
          .filter((item) => item.label || item.href)
        setPrimaryNav(trimmedPrimary.length > 0 ? trimmedPrimary : DEFAULT_PRIMARY_NAV.map((item) => createNavigationDraft(item)))

        const secondaryValue = Array.isArray(navigationValue.secondary) ? navigationValue.secondary : []
        const trimmedSecondary = secondaryValue
          .map((item) =>
            createNavigationDraft({
              label: typeof item?.label === 'string' ? item.label : '',
              href: typeof item?.href === 'string' ? item.href : '',
              icon: item?.icon ?? 'Home',
            })
          )
          .filter((item) => item.label || item.href)
        setSecondaryNav(
          trimmedSecondary.length > 0
            ? trimmedSecondary
            : DEFAULT_SECONDARY_NAV.map((item) => createNavigationDraft(item))
        )

        const brandValue = navigationValue.brand ?? {}
        setBrandName(typeof brandValue.name === 'string' && brandValue.name.trim() ? brandValue.name : DEFAULT_BRAND_NAME)
        setBrandTagline(
          typeof brandValue.tagline === 'string' && brandValue.tagline.trim()
            ? brandValue.tagline
            : DEFAULT_BRAND_TAGLINE
        )

        const globalValue = (globalPayload.value ?? {}) as LayoutGlobalValue
        setFooterDescription(
          typeof globalValue.footer?.description === 'string' && globalValue.footer.description.trim()
            ? globalValue.footer.description
            : DEFAULT_FOOTER_DESCRIPTION
        )
        setContactEmail(
          typeof globalValue.contact?.email === 'string' && globalValue.contact.email.trim()
            ? globalValue.contact.email
            : DEFAULT_CONTACT.email
        )
        setContactPhone(
          typeof globalValue.contact?.phone === 'string' && globalValue.contact.phone.trim()
            ? globalValue.contact.phone
            : DEFAULT_CONTACT.phone
        )
        setContactAddress(
          typeof globalValue.contact?.address === 'string' && globalValue.contact.address.trim()
            ? globalValue.contact.address
            : DEFAULT_CONTACT.address
        )

        setStatus(null)
      } catch (error) {
        if (!isMounted) return
        setStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat konfigurasi homepage.',
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

  const handleFeatureChange = (id: string, field: keyof Omit<FeatureDraft, 'id'>, value: string) => {
    setFeatures((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === 'icon' && value in iconRegistry ? (value as IconName) : value,
            }
          : item
      )
    )
  }

  const addFeature = () => {
    setFeatures((prev) => [...prev, createFeatureDraft()])
  }

  const removeFeature = (id: string) => {
    setFeatures((prev) => prev.filter((item) => item.id !== id))
  }

  const handlePrimaryChange = (id: string, field: 'label' | 'href', value: string) => {
    setPrimaryNav((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const addPrimaryNav = () => {
    setPrimaryNav((prev) => [...prev, createNavigationDraft()])
  }

  const removePrimaryNav = (id: string) => {
    setPrimaryNav((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSecondaryChange = (id: string, field: 'label' | 'href' | 'icon', value: string) => {
    setSecondaryNav((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === 'icon' ? (value as BottomNavIcon) : value,
            }
          : item
      )
    )
  }

  const addSecondaryNav = () => {
    setSecondaryNav((prev) => [...prev, createNavigationDraft({ icon: 'Home' })])
  }

  const removeSecondaryNav = (id: string) => {
    setSecondaryNav((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSave = async () => {
    setStatus(null)
    setSaving(true)
    try {
      const payloads: SettingPayload[] = [
        {
          key: 'page_home',
          value: {
            hero,
            features: features.map(({ title, description, icon }) => ({ title, description, icon })),
          },
        },
        {
          key: 'layout_navigation',
          value: {
            brand: {
              name: brandName,
              tagline: brandTagline,
            },
            primary: primaryNav
              .filter((item) => item.label || item.href)
              .map(({ label, href }) => ({ label, href })),
            secondary: secondaryNav
              .filter((item) => item.label || item.href)
              .map(({ label, href, icon }) => ({ label, href, icon })),
          },
        },
        {
          key: 'layout_global',
          value: {
            footer: {
              description: footerDescription,
            },
            contact: {
              email: contactEmail,
              phone: contactPhone,
              address: contactAddress,
            },
          },
        },
      ]

      await Promise.all(
        payloads.map((payload) =>
          fetchWithAuth('/api/settings', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          }).then(async (response) => {
            if (!response.ok) {
              const error = (await response.json().catch(() => null)) as Record<string, unknown> | null
              const message = error?.message ? String(error.message) : 'Gagal menyimpan perubahan.'
              throw new Error(message)
            }
          })
        )
      )

      setStatus({ type: 'success', message: 'Konten homepage dan navigasi tersimpan.' })
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
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Homepage & Navigasi</h1>
        <p className="text-sm text-slate-500 max-w-3xl">
          Kelola hero, fitur, dan menu publik agar beranda tetap konsisten dengan brand dan alur pengguna.
        </p>
      </header>

      <section className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Header</p>
            <h2 className="text-2xl font-semibold text-slate-900">Navigasi Publik</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
            Header
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Nama brand (header)
            <input
              type="text"
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              className="input-field"
              placeholder="Smart RT"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Tagline singkat
            <input
              type="text"
              value={brandTagline}
              onChange={(event) => setBrandTagline(event.target.value)}
              className="input-field"
              placeholder="Solusi digital manajemen lingkungan"
            />
          </label>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Menu utama</p>
            <button
              type="button"
              onClick={addPrimaryNav}
              className="group inline-flex items-center gap-2 rounded-corporate border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              Tambah tautan
            </button>
          </div>
          <div className="space-y-3">
            {primaryNav.map((item, index) => (
              <div key={item.id} className="grid gap-3 rounded-[1rem] border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-600">Tautan {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removePrimaryNav(item.id)}
                    className="text-xs font-semibold uppercase tracking-[0.3em] text-red-500 transition hover:text-red-600"
                  >
                    Hapus
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Label menu
                    <input
                      type="text"
                      value={item.label}
                      onChange={(event) => handlePrimaryChange(item.id, 'label', event.target.value)}
                      className="input-field"
                      placeholder="Mis. Beranda"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Tujuan (href)
                    <input
                      type="text"
                      value={item.href}
                      onChange={(event) => handlePrimaryChange(item.id, 'href', event.target.value)}
                      className="input-field"
                      placeholder="/blogs"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Menu bawah (mobile)</p>
            <button
              type="button"
              onClick={addSecondaryNav}
              className="group inline-flex items-center gap-2 rounded-corporate border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              Tambah menu
            </button>
          </div>
          <div className="space-y-3">
            {secondaryNav.map((item, index) => (
              <div key={item.id} className="grid gap-3 rounded-[1rem] border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <span className="rounded-full bg-primary/10 p-2 text-primary">
                      {item.icon === 'Home' ? <Home className="h-4 w-4" /> : null}
                      {item.icon === 'Newspaper' ? <Newspaper className="h-4 w-4" /> : null}
                      {item.icon === 'Info' ? <Info className="h-4 w-4" /> : null}
                      {item.icon === 'Zap' ? <Zap className="h-4 w-4" /> : null}
                    </span>
                    Menu {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeSecondaryNav(item.id)}
                    className="text-xs font-semibold uppercase tracking-[0.3em] text-red-500 transition hover:text-red-600"
                  >
                    Hapus
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Label
                    <input
                      type="text"
                      value={item.label}
                      onChange={(event) => handleSecondaryChange(item.id, 'label', event.target.value)}
                      className="input-field"
                      placeholder="Pastikan nama singkat"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Target
                    <input
                      type="text"
                      value={item.href}
                      onChange={(event) => handleSecondaryChange(item.id, 'href', event.target.value)}
                      className="input-field"
                      placeholder="/about"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Ikon
                  <select
                    value={item.icon}
                    onChange={(event) => handleSecondaryChange(item.id, 'icon', event.target.value)}
                    className="input-field"
                  >
                    {BOTTOM_NAV_ICON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(250px,1fr)]">
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Hero</p>
              <h2 className="text-2xl font-semibold text-slate-900">Banner depan</h2>
              <p className="text-sm text-slate-500">Judul dan subjudul akan langsung tampil di beranda.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
              Hero
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Judul utama</label>
            <input
              type="text"
              value={hero.title}
              onChange={(event) => setHero((prev) => ({ ...prev, title: event.target.value }))}
              className="input-field text-base font-semibold tracking-tight shadow-inner shadow-slate-200"
              placeholder="Contoh: Digitalize Your Community"
            />

            <label className="block text-sm font-semibold text-slate-700">Subjudul</label>
            <textarea
              value={hero.subtitle}
              onChange={(event) => setHero((prev) => ({ ...prev, subtitle: event.target.value }))}
              rows={3}
              className="input-field resize-none text-sm leading-relaxed"
              placeholder="Contoh: Smart RT menghadirkan keterbukaan dan efisiensi untuk RT modern."
            />
          </div>
        </div>

        <div className="card p-6 space-y-4 border border-primary/20 bg-gradient-to-br from-primary/10 via-white/60 to-slate-50">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Pratinjau</p>
            <h3 className="text-xl font-semibold text-slate-900">Kisah hero</h3>
          </div>
          <div className="rounded-[1.5rem] border border-white/60 bg-white/70 p-5 shadow-inner shadow-slate-300">
            <p className="text-lg font-black text-slate-900 leading-tight">{hero.title || 'Judul hero kosong'}</p>
            <p className="mt-2 text-sm text-slate-600">{hero.subtitle || 'Subjudul akan tampil di sini setelah disimpan.'}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Zap className="text-primary" />
            <span>Perubahan hero tersinkron langsung saat Anda menyimpan.</span>
          </div>
        </div>
      </section>

      <section className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Widget</p>
            <h2 className="text-2xl font-semibold text-slate-900">Kartu fitur</h2>
          </div>
          <button
            type="button"
            onClick={addFeature}
            className="group inline-flex items-center gap-2 rounded-corporate border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Tambah fitur
          </button>
        </div>

        <div className="space-y-6">
          {features.map((feature, index) => {
            const IconComponent = iconRegistry[feature.icon]
            return (
              <div key={feature.id} className="space-y-3 rounded-[1.25rem] border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-600">
                    <span className="rounded-full bg-primary/10 p-2 text-primary">
                      <IconComponent className="h-4 w-4" />
                    </span>
                    Widget {index + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFeature(feature.id)}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-500 transition hover:text-red-600"
                  >
                    <Trash className="h-4 w-4" />
                    Hapus
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Judul fitur
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(event) => handleFeatureChange(feature.id, 'title', event.target.value)}
                      className="input-field"
                      placeholder="Mis. Transparansi keuangan"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Ikon
                    <select
                      value={feature.icon}
                      onChange={(event) => handleFeatureChange(feature.id, 'icon', event.target.value)}
                      className="input-field"
                    >
                      {ICON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Deskripsi
                  <textarea
                    value={feature.description}
                    onChange={(event) => handleFeatureChange(feature.id, 'description', event.target.value)}
                    rows={2}
                    className="input-field resize-none text-sm"
                    placeholder="Jelaskan keunggulan singkat fitur."
                  />
                </label>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-500">
          Widget akan tampil di halaman depan sehingga pastikan judul dan deskripsi ringkas tapi mencerminkan manfaat utama.
        </p>
      </section>

      <section className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Footer</p>
            <h2 className="text-2xl font-semibold text-slate-900">Kontak & ringkasan</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
            Footer
          </span>
        </div>

        <div className="grid gap-4">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Ringkasan footer
            <textarea
              value={footerDescription}
              onChange={(event) => setFooterDescription(event.target.value)}
              rows={3}
              className="input-field resize-none text-sm leading-relaxed"
              placeholder="Deskripsi singkat yang muncul di footer."
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Email
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                className="input-field"
                placeholder="support@smartrt.id"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Telepon
              <input
                type="text"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                className="input-field"
                placeholder="+62 812 3456 7890"
              />
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Alamat
            <input
              type="text"
              value={contactAddress}
              onChange={(event) => setContactAddress(event.target.value)}
              className="input-field"
              placeholder="Jakarta, Indonesia"
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
