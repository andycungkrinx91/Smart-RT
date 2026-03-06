import { NextResponse } from 'next/server'
import { env, isAllowedOrigin } from '@/lib/env'
import { getTokenFromRequest } from '@/lib/auth'

type UserItem = {
  userid: number
  name: string
  email: string
  role: 'Administrator' | 'Management'
  isLogin: boolean
  created_at: string
}

type ProfileResponse = {
  userid: number
  name: string
  username: string
  email: string
  role: 'Administrator' | 'Management'
  created_at: string
}

type ErrorBody = {
  message?: string
  detail?: string
}

type ProfileUpdatePayload = {
  username?: unknown
  password?: unknown
}

function unauthorizedResponse() {
  return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
}

function parseApiError(payload: unknown, fallback: string) {
  if (typeof payload !== 'object' || payload === null) {
    return fallback
  }

  const errorPayload = payload as ErrorBody
  if (typeof errorPayload.message === 'string' && errorPayload.message.trim()) {
    return errorPayload.message
  }
  if (typeof errorPayload.detail === 'string' && errorPayload.detail.trim()) {
    return errorPayload.detail
  }
  return fallback
}

function toProfileResponse(user: UserItem): ProfileResponse {
  return {
    userid: user.userid,
    name: user.name,
    username: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  }
}

/**
 * Fetch the current user's own profile from the backend /me endpoint.
 * Works for both ADMINISTRATOR and MANAGEMENT roles — no admin privilege required.
 */
async function fetchMe(token: string): Promise<{
  ok: boolean
  status: number
  message: string
  user: UserItem | null
}> {
  const response = await fetch(`${env.API_BASE_URL}/me`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'X-API-Key': env.BACKEND_API_KEY,
    },
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: parseApiError(payload, 'Gagal mengambil profil'),
      user: null,
    }
  }

  const user = payload as UserItem
  if (typeof user?.userid !== 'number') {
    return {
      ok: false,
      status: 502,
      message: 'Response profil tidak valid',
      user: null,
    }
  }

  return { ok: true, status: 200, message: '', user }
}

export async function GET(request: Request) {
  const token = getTokenFromRequest(request)
  if (!token) {
    return unauthorizedResponse()
  }

  const result = await fetchMe(token)
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status })
  }

  return NextResponse.json(toProfileResponse(result.user!))
}

export async function PUT(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ message: 'Origin tidak valid' }, { status: 403 })
  }

  const token = getTokenFromRequest(request)
  if (!token) {
    return unauthorizedResponse()
  }

  const body = (await request.json().catch(() => null)) as ProfileUpdatePayload | null
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!username) {
    return NextResponse.json({ message: 'Username wajib diisi' }, { status: 400 })
  }

  if (username.length > 64) {
    return NextResponse.json({ message: 'Username maksimal 64 karakter' }, { status: 400 })
  }

  if (password && password.length < 8) {
    return NextResponse.json({ message: 'Password minimal 8 karakter' }, { status: 400 })
  }

  // Build self-service update payload for the /me endpoint (name + optional password only)
  const updatePayload: Record<string, unknown> = { name: username }
  if (password) {
    updatePayload.password = password
  }

  const response = await fetch(`${env.API_BASE_URL}/me`, {
    method: 'PUT',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'X-API-Key': env.BACKEND_API_KEY,
    },
    body: JSON.stringify(updatePayload),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    return NextResponse.json(
      { message: parseApiError(payload, 'Gagal memperbarui profil') },
      { status: response.status },
    )
  }

  const updatedUser = payload as UserItem
  return NextResponse.json(toProfileResponse(updatedUser))
}
