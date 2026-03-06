import { NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import { env, isAllowedOrigin } from '@/lib/env'

type UploadResponse = {
  url?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])

export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ message: 'Origin tidak valid' }, { status: 403 })
  }

  const token = getTokenFromRequest(req)
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  }

  const formData = await req.formData().catch(() => null)
  const file = formData?.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'File gambar wajib diisi' }, { status: 400 })
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return NextResponse.json({ message: 'Format gambar tidak didukung' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ message: 'Ukuran gambar maksimal 5MB' }, { status: 400 })
  }

  try {
    const backendFormData = new FormData()
    backendFormData.append('file', file)

    const response = await fetch(`${env.API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'X-API-Key': env.BACKEND_API_KEY,
      },
      body: backendFormData,
    })

    const payload = (await response.json().catch(() => null)) as UploadResponse | null
    if (!response.ok) {
      return NextResponse.json({ message: 'Gagal mengunggah gambar ke server' }, { status: response.status })
    }

    return NextResponse.json({
      url: payload?.url,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    })
  } catch {
    return NextResponse.json({ message: 'Gagal memproses file gambar' }, { status: 500 })
  }
}
