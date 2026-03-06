import { NextResponse } from 'next/server'

type ApiResponse = { code?: number; message?: string; data?: unknown }

const TIMEOUT_MS = 5000

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET() {
  try {
    const response = await fetchWithTimeout('https://equran.id/api/v2/shalat/provinsi', {
      headers: { accept: 'application/json' },
      next: { revalidate: 86400 },
    })

    const payload = (await response.json().catch(() => null)) as ApiResponse | null
    if (!response.ok) {
      return NextResponse.json({ code: 0, message: 'Failed to load provinces', data: [] }, { status: response.status })
    }
    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ code: 0, message: 'Service unavailable', data: [] }, { status: 502 })
  }
}
