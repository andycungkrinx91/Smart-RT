type HeaderCarrier = {
  headers: Headers
}

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://smart-rt.id'

function firstHeaderValue(headers: Headers, key: string) {
  const value = headers.get(key)
  if (!value) {
    return null
  }
  return value.split(',')[0]?.trim() || null
}

function isLocalHostname(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local')
  )
}

function getRequestHost(req: HeaderCarrier) {
  return firstHeaderValue(req.headers, 'x-forwarded-host') || firstHeaderValue(req.headers, 'host')
}

function getRequestHostname(req: HeaderCarrier) {
  const host = getRequestHost(req)
  if (!host) {
    return null
  }

  try {
    return new URL(`http://${host}`).hostname.toLowerCase()
  } catch {
    return host.split(':')[0]?.toLowerCase() || null
  }
}

export const env = {
  API_BASE_URL: process.env.API_BASE_URL || 'http://backend:8000',
  BACKEND_API_KEY: process.env.BACKEND_API_KEY || '',
  NEXT_PUBLIC_SITE_URL: DEFAULT_SITE_URL,
}

export function getSiteUrlFromRequest(req: HeaderCarrier) {
  const host = getRequestHost(req)
  if (!host) {
    return env.NEXT_PUBLIC_SITE_URL
  }

  const proto = firstHeaderValue(req.headers, 'x-forwarded-proto')
  const hostname = getRequestHostname(req)
  const protocol = proto || (hostname && isLocalHostname(hostname) ? 'http' : 'https')
  return `${protocol}://${host}`
}

export function isAllowedOrigin(req: HeaderCarrier) {
  const origin = req.headers.get('origin')
  if (!origin) {
    return true
  }

  try {
    const requestOrigin = new URL(getSiteUrlFromRequest(req)).origin
    const configuredOrigin = env.NEXT_PUBLIC_SITE_URL ? new URL(env.NEXT_PUBLIC_SITE_URL).origin : null
    const incomingOrigin = new URL(origin).origin

    return incomingOrigin === requestOrigin || (configuredOrigin !== null && incomingOrigin === configuredOrigin)
  } catch {
    return false
  }
}

export function getTenantFromRequest(req: HeaderCarrier) {
  const hostname = getRequestHostname(req)
  if (!hostname || isLocalHostname(hostname) && !hostname.endsWith('.localhost')) {
    return null
  }

  const parts = hostname.split('.')
  if (parts.length < 2) {
    return null
  }

  if (parts[0] === 'www') {
    return null
  }

  return parts[0] || null
}
