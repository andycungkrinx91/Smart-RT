'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const TOKEN_KEY = 'srt_access_token'
const SESSION_COOKIE_NAME = 'srt_session'

function clearSessionMarker() {
  document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`
}

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) {
        clearSessionMarker()
        router.replace('/login')
        setStatus('unauthenticated')
        return
      }

      try {
        // Ping profile endpoint to verify token validity
        const res = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (res.status === 401) {
          localStorage.removeItem(TOKEN_KEY)
          clearSessionMarker()
          router.replace('/login')
          setStatus('unauthenticated')
        } else {
          setStatus('authenticated')
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        // On network error, we might want to stay in 'checking' or assume authenticated if token exists
        // For now, let's assume authenticated if token exists but ping fails due to network
        setStatus('authenticated')
      }
    }

    void checkAuth()
  }, [router])

  if (status === 'checking' || status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm text-slate-500">Memeriksa sesi...</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
