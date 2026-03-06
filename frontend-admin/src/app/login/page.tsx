'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'

const SESSION_COOKIE_NAME = 'srt_session'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('srt_access_token')
    if (token) {
      document.cookie = `${SESSION_COOKIE_NAME}=1; Path=/; Max-Age=86400; SameSite=Lax`
      router.replace('/admin')
    }
  }, [router])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at top, color-mix(in srgb, var(--color-brand) 14%, transparent), transparent 48%)',
        }}
      />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-primary/[0.06] to-transparent" />
      <div className="relative w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  )
}
