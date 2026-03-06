'use client'

import { useEffect, useRef, useState } from 'react'
import { UpdatePasswordForm } from '@/components/profile/UpdatePasswordForm'
import { fetchWithAuth } from '@/lib/client-api'
import { getUserFriendlyApiError, toUserFriendlyMessage } from '@/lib/user-friendly-error'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getErrorMessage(response: Response, fallback: string) {
  return getUserFriendlyApiError(response, fallback)
}

async function fetchCurrentUsername(): Promise<string> {
  const response = await fetchWithAuth('/api/profile', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Maaf, profil belum bisa dimuat saat ini.'))
  }

  const payload = (await response.json()) as unknown
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Maaf, profil belum bisa dimuat saat ini.')
  }

  const data = payload as Record<string, unknown>
  const source =
    typeof data.data === 'object' && data.data !== null
      ? (data.data as Record<string, unknown>)
      : data

  const username =
    typeof source.username === 'string' && source.username.trim()
      ? source.username.trim()
      : typeof source.name === 'string' && source.name.trim()
        ? source.name.trim()
        : null

  if (!username) {
    throw new Error('Maaf, profil belum bisa dimuat saat ini.')
  }

  return username
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  // We only fetch the username so we can pass it to the PUT endpoint.
  // The name/email/role are intentionally not displayed per spec.
  const usernameRef = useRef<string>('')
  const [initError, setInitError] = useState('')

  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useEffect(() => {
    fetchCurrentUsername()
      .then((name) => {
        usernameRef.current = name
        setInitError('')
      })
      .catch((error) => {
        setInitError(toUserFriendlyMessage(error instanceof Error ? error.message : null, 'Maaf, profil belum bisa dimuat saat ini.'))
      })
  }, [])

  const handlePasswordUpdate = async (newPassword: string) => {
    setPasswordError('')
    setPasswordSuccess('')

    const response = await fetchWithAuth('/api/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: usernameRef.current,
        password: newPassword,
      }),
    })

    if (!response.ok) {
      const msg = await getErrorMessage(response, 'Maaf, kata sandi belum bisa diperbarui saat ini.')
      setPasswordError(msg)
      throw new Error(msg)
    }

    // Refresh the cached username in case the backend echoes an updated value
    try {
      const updated = await fetchCurrentUsername()
      usernameRef.current = updated
    } catch {
      // Non-critical — silently ignore
    }

    setPasswordSuccess('Password berhasil diperbarui.')
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-start justify-center py-8">
      <div className="w-full max-w-md space-y-6">

        {/* Page heading */}
        <div className="px-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Keamanan</h1>
          <p className="mt-1 text-sm text-slate-500">Perbarui kata sandi akun Anda melalui formulir berikut.</p>
        </div>

        {/* Init error — shown only when the profile fetch itself fails */}
        {initError ? (
          <div
            role="alert"
            className="rounded-corporate border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {initError}
          </div>
        ) : null}

        {/* Password form card */}
        <UpdatePasswordForm
          onSubmit={handlePasswordUpdate}
          externalError={passwordError}
          externalSuccess={passwordSuccess}
        />

      </div>
    </div>
  )
}
