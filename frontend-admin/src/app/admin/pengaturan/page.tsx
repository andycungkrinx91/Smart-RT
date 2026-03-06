'use client'

import { Check } from 'lucide-react'
import { useThemeColor } from '@/hooks/useThemeColor'
import { THEME_COLORS } from '@/lib/theme'

function swatchGradient(color: string) {
  return `linear-gradient(145deg, color-mix(in srgb, ${color} 45%, white) 0%, ${color} 58%, color-mix(in srgb, ${color} 74%, black) 100%)`
}

export default function PengaturanPage() {
  const { themeColor, setThemeColor } = useThemeColor()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Pengaturan Tema</h1>
        <p className="mt-1 text-sm text-slate-500">Pilih warna utama antarmuka. Perubahan langsung diterapkan di seluruh aplikasi.</p>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3 rounded-corporate border border-primary/20 bg-primary/[0.06] px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Warna Aktif</p>
            <p className="mt-1 text-base font-semibold tracking-tight text-slate-900">{themeColor.toUpperCase()}</p>
          </div>
          <span
            className="block h-10 w-10 shrink-0 rounded-corporate border border-white/80 shadow-sm"
            style={{ background: swatchGradient(themeColor) }}
            aria-hidden="true"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {THEME_COLORS.map((color) => {
            const active = themeColor === color
            return (
              <button
                key={color}
                type="button"
                onClick={() => setThemeColor(color)}
                className={`group relative rounded-corporate border p-1.5 text-left transition-all ${
                  active
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-primary/40'
                }`}
                aria-label={`Gunakan tema ${color.toUpperCase()}`}
                aria-pressed={active}
              >
                <span className="block h-16 w-full rounded-[0.2rem]" style={{ background: swatchGradient(color) }} />
                <span className="mt-2 block px-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600 transition-colors group-hover:text-primary">
                  {color.toUpperCase()}
                </span>
                {active ? (
                  <span className="absolute right-2 top-2 rounded-full border border-white/80 bg-surface/90 p-1 text-primary">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-xs text-slate-500">Preferensi tema otomatis disimpan di browser ini.</p>
      </section>
    </div>
  )
}
