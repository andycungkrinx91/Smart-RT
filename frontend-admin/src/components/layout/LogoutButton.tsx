'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/client-api'

const TOKEN_KEY = 'srt_access_token'
const SESSION_COOKIE_NAME = 'srt_session'

function clearClientSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignore storage access failures.
  }
  document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`
}

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()

  return (
    <button
      className={
        className ||
        "group flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-[linear-gradient(120deg,var(--color-brand),color-mix(in_srgb,var(--color-brand),black_35%))] px-3 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
      }
      onClick={async () => {
        try {
          await fetchWithAuth('/api/auth/logout', { method: 'POST' })
        } catch {
          // Redirect is still forced after local cleanup.
        }
        clearClientSession()
        router.replace('/login')
        router.refresh()
      }}
      type="button"
    >
      <LogOut className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
      Logout
    </button>
  )
}
