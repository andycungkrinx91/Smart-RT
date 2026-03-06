import 'server-only'

import { redirect } from 'next/navigation'
import { env } from './env'

function redirectToLogin(): never {
  redirect('/login')
}

async function apiFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${env.API_BASE_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
      'X-API-Key': env.BACKEND_API_KEY,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  if (res.status === 401) redirectToLogin()
  return res
}

export async function apiGet(path: string, token: string) {
  const res = await apiFetch(path, token, { method: 'GET' })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
