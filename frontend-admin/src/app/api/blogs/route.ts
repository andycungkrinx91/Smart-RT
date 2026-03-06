import { NextResponse } from 'next/server'
import { env, isAllowedOrigin } from '@/lib/env'
import { getTokenFromRequest } from '@/lib/auth'

type BlogMutationPayload = {
  id?: unknown
  title?: unknown
  content_html?: unknown
  content_css?: unknown
  content_json?: unknown
}

function getApiError(payload: unknown, fallback: string) {
  if (typeof payload !== 'object' || payload === null) {
    return fallback
  }

  const maybe = payload as { message?: unknown; detail?: unknown }
  if (typeof maybe.message === 'string' && maybe.message.trim()) {
    return maybe.message
  }
  if (typeof maybe.detail === 'string' && maybe.detail.trim()) {
    return maybe.detail
  }
  return fallback
}

function buildHeaders(token: string, withJson = false): HeadersInit {
  const headers: HeadersInit = {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
    'X-API-Key': env.BACKEND_API_KEY,
  }

  if (withJson) {
    headers['content-type'] = 'application/json'
  }

  return headers
}

function validateOrigin(req: Request) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ message: 'Origin tidak valid' }, { status: 403 })
  }
  return null
}

async function callBackend(path: string, init: RequestInit) {
  const response = await fetch(`${env.API_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => null)) as unknown

  return { response, payload }
}

export async function GET(req: Request) {
  const token = getTokenFromRequest(req)
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { response, payload } = await callBackend('/blogs', {
      method: 'GET',
      headers: buildHeaders(token),
    })

    if (!response.ok) {
      return NextResponse.json({ message: getApiError(payload, 'Gagal mengambil data blog') }, { status: response.status })
    }

    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ message: 'Backend tidak merespons' }, { status: 502 })
  }
}

export async function POST(req: Request) {
  const originError = validateOrigin(req)
  if (originError) {
    return originError
  }

  const token = getTokenFromRequest(req)
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  }

  const payload = (await req.json().catch(() => null)) as BlogMutationPayload | null
  const title = typeof payload?.title === 'string' ? payload.title.trim() : ''
  const contentHtml = typeof payload?.content_html === 'string' ? payload.content_html.trim() : ''

  if (!title || !contentHtml) {
    return NextResponse.json({ message: 'Judul dan konten wajib diisi' }, { status: 400 })
  }

  try {
    const { response, payload: backendPayload } = await callBackend('/addblog', {
      method: 'POST',
      headers: buildHeaders(token, true),
      body: JSON.stringify({
        title,
        content_html: contentHtml,
        content_css: typeof payload?.content_css === 'string' ? payload.content_css : null,
        content_json: typeof payload?.content_json === 'string' ? payload.content_json : null,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ message: getApiError(backendPayload, 'Gagal menambah blog') }, { status: response.status })
    }

    return NextResponse.json(backendPayload)
  } catch {
    return NextResponse.json({ message: 'Backend tidak merespons' }, { status: 502 })
  }
}

export async function PUT(req: Request) {
  const originError = validateOrigin(req)
  if (originError) {
    return originError
  }

  const token = getTokenFromRequest(req)
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  }

  const payload = (await req.json().catch(() => null)) as BlogMutationPayload | null
  const id = Number(payload?.id)
  const title = typeof payload?.title === 'string' ? payload.title.trim() : ''
  const contentHtml = typeof payload?.content_html === 'string' ? payload.content_html.trim() : ''

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: 'ID blog tidak valid' }, { status: 400 })
  }

  if (!title || !contentHtml) {
    return NextResponse.json({ message: 'Judul dan konten wajib diisi' }, { status: 400 })
  }

  try {
    const { response, payload: backendPayload } = await callBackend('/updateblog', {
      method: 'PUT',
      headers: buildHeaders(token, true),
      body: JSON.stringify({
        id,
        title,
        content_html: contentHtml,
        content_css: typeof payload?.content_css === 'string' ? payload.content_css : null,
        content_json: typeof payload?.content_json === 'string' ? payload.content_json : null,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ message: getApiError(backendPayload, 'Gagal memperbarui blog') }, { status: response.status })
    }

    return NextResponse.json(backendPayload)
  } catch {
    return NextResponse.json({ message: 'Backend tidak merespons' }, { status: 502 })
  }
}

export async function DELETE(req: Request) {
  const originError = validateOrigin(req)
  if (originError) {
    return originError
  }

  const token = getTokenFromRequest(req)
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  }

  const id = Number(new URL(req.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: 'ID blog tidak valid' }, { status: 400 })
  }

  try {
    const { response, payload } = await callBackend(`/deleteblog?id=${id}`, {
      method: 'DELETE',
      headers: buildHeaders(token),
    })

    if (!response.ok) {
      return NextResponse.json({ message: getApiError(payload, 'Gagal menghapus blog') }, { status: response.status })
    }

    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ message: 'Backend tidak merespons' }, { status: 502 })
  }
}
