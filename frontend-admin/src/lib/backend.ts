function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, '')
}

export function getBackendBaseUrl() {
  return normalizeBaseUrl(process.env.API_BASE_URL || 'http://backend:8000')
}

export function getBackendApiKey() {
  return (process.env.BACKEND_API_KEY || '').trim()
}

export function buildBackendHeaders(opts?: { withBearer?: boolean }) {
  const apiKey = getBackendApiKey()
  const bearer = opts?.withBearer ? (process.env.BACKEND_PUBLIC_BEARER_TOKEN || '').trim() : ''

  return {
    accept: 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
  } satisfies HeadersInit
}
