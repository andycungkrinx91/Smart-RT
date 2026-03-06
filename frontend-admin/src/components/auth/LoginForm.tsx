'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, LogIn, Mail } from 'lucide-react'
import { toUserFriendlyMessage } from '@/lib/user-friendly-error'

type LoginErrorPayload = {
  message?: string
}

type LoginSuccessPayload = {
  ok: true
  token: string
}

const SESSION_COOKIE_NAME = 'srt_session'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as LoginErrorPayload
        throw new Error(toUserFriendlyMessage(payload.message, 'Email atau password belum sesuai. Silakan coba lagi.'))
      }

      const data = (await res.json()) as LoginSuccessPayload
      localStorage.setItem('srt_access_token', data.token)
      document.cookie = `${SESSION_COOKIE_NAME}=1; Path=/; Max-Age=86400; SameSite=Lax`

      router.replace('/admin')
      router.refresh()
    } catch (err) {
      setError(toUserFriendlyMessage(err instanceof Error ? err.message : null, 'Maaf, proses login sedang terkendala. Silakan coba lagi.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="card w-full p-7 sm:p-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-corporate border border-primary/20 bg-primary/10 text-primary">
          <LogIn className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Login Admin</h1>
        <p className="mt-1 text-sm text-slate-500">Masuk untuk mengelola layanan Smart-RT.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@smart-rt.id"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field py-3 pl-12"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Masukkan password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field py-3 pl-12"
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-corporate border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-70">
          {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
        </button>
      </form>
    </motion.div>
  )
}
