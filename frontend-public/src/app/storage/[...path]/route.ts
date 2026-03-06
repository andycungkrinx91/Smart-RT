import { getBackendBaseUrl } from '@/lib/backend'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const baseUrl = getBackendBaseUrl()
    const joinedPath = Array.isArray(path) ? path.join('/') : ''

    const targetUrl = `${baseUrl}/storage/${joinedPath}`
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      cache: 'no-store',
    })

    const headers = new Headers()
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        headers.set(key, value)
      }
    })

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error) {
    console.error('Storage proxy error:', error)
    return new Response('Proxy Error', { status: 502 })
  }
}
