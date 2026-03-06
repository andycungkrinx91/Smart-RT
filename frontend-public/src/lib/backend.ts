function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, '')
}

export function getBackendBaseUrl() {
  return normalizeBaseUrl(process.env.API_BASE_URL || 'http://backend:8000')
}

export function getBackendApiKey() {
  return (process.env.BACKEND_API_KEY || '').trim()
}

export function getBackendPublicBearerToken() {
  return (process.env.BACKEND_PUBLIC_BEARER_TOKEN || '').trim()
}

export function getBackendPublicEmail() {
  return (process.env.BACKEND_PUBLIC_EMAIL || '').trim()
}

export function getBackendPublicPassword() {
  return (process.env.BACKEND_PUBLIC_PASSWORD || '').trim()
}

export function buildBackendHeaders(opts?: { withBearer?: boolean }) {
  const apiKey = getBackendApiKey()
  const bearer = opts?.withBearer ? getBackendPublicBearerToken() : ''
  return {
    accept: 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
  } satisfies HeadersInit
}

type LoginResponse = { access_token?: unknown }

let cachedBearerToken = ''

export async function getOrLoginBackendBearerToken(baseUrl: string) {
  if (cachedBearerToken) return cachedBearerToken

  const tokenFromEnv = getBackendPublicBearerToken()
  if (tokenFromEnv) {
    cachedBearerToken = tokenFromEnv
    return tokenFromEnv
  }

  const email = getBackendPublicEmail()
  const password = getBackendPublicPassword()
  if (!email || !password) return ''

  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(getBackendApiKey() ? { 'X-API-Key': getBackendApiKey() } : {}),
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  if (!response.ok) return ''
  const payload = (await response.json().catch(() => null)) as LoginResponse | null
  const token = typeof payload?.access_token === 'string' ? payload.access_token.trim() : ''
  if (!token) return ''

  cachedBearerToken = token
  return token
}
