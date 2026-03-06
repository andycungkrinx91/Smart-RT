const TECHNICAL_PATTERNS = [
  /internal server error/i,
  /request gagal/i,
  /request failed/i,
  /exception/i,
  /stack trace/i,
  /sql/i,
  /syntax/i,
  /origin:/i,
  /unauthorized/i,
  /forbidden/i,
  /network error/i,
  /timeout/i,
]

type ApiErrorPayload = {
  message?: unknown
  detail?: unknown
  error?: unknown
}

export function toUserFriendlyMessage(message: unknown, fallback: string): string {
  if (typeof message !== 'string') {
    return fallback
  }

  const trimmed = message.trim()
  if (!trimmed) {
    return fallback
  }

  const isTechnical = TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed))
  if (isTechnical) {
    return fallback
  }

  return trimmed
}

export async function getUserFriendlyApiError(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null
  const candidate = payload?.message ?? payload?.detail ?? payload?.error
  return toUserFriendlyMessage(candidate, fallback)
}
