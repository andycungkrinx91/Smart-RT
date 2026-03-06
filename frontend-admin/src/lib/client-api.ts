const TOKEN_KEY = 'srt_access_token'
const SESSION_COOKIE_NAME = 'srt_session'
let redirectingToLogin = false

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignore storage access errors in restricted browser modes.
  }

  if (typeof document !== 'undefined') {
    document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`
  }
}

export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getToken()

  const headers = new Headers(init?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let resolvedInput: RequestInfo | URL = input
  if (typeof input === 'string' && input.startsWith('/')) {
    const baseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL
    if (baseUrl) {
      resolvedInput = `${baseUrl.replace(/\/$/, '')}${input}`
    }
  }

  const res = await fetch(resolvedInput, { ...init, headers })

  if (res.status === 401) {
    clearToken()

    if (!redirectingToLogin) {
      redirectingToLogin = true
      window.location.assign('/login')
    }

    throw new Error('Unauthorized')
  }

  return res
}
