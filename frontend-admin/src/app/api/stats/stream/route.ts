/**
 * GET /api/stats/stream
 *
 * Streaming proxy: forwards the backend SSE `/stats/stream` endpoint to the
 * browser. This route lives inside the Next.js API layer so it can inject the
 * server-side API key and the caller's Bearer token without exposing secrets
 * to the client.
 *
 * Design notes:
 *  - We pipe the upstream ReadableStream directly to the response body –
 *    zero buffering, minimal latency.
 *  - The route is intentionally NOT wrapped in NextResponse.json(); we return
 *    a raw Response with `text/event-stream` to keep SSE semantics intact.
 *  - If the upstream closes or errors the client's EventSource will
 *    automatically reconnect (per the SSE spec), so we just let it close.
 */

import { env } from '@/lib/env'
import { getTokenFromRequest } from '@/lib/auth'

/** How long (ms) to wait for the upstream to start responding. */
const UPSTREAM_TIMEOUT_MS = 10_000

export const dynamic = 'force-dynamic'

/**
 * Extracts the Bearer token from either:
 *  1. The `Authorization: Bearer <token>` request header (server-to-server), OR
 *  2. The `?token=<token>` query parameter (used by browser EventSource which
 *     cannot set custom headers).
 *
 * The token is validated to be a non-empty string; no JWT parsing is done here
 * – the backend is authoritative and will reject invalid tokens with 401.
 */
function resolveToken(req: Request): string | null {
  // Prefer header-based auth (keeps the token out of server logs in prod).
  const headerToken = getTokenFromRequest(req)
  if (headerToken) return headerToken

  // Fallback: query-param for EventSource usage in the browser.
  try {
    const url = new URL(req.url)
    const qp = url.searchParams.get('token')
    if (qp && qp.trim()) return qp.trim()
  } catch {
    // Malformed URL – fall through to unauthenticated response.
  }

  return null
}

export async function GET(req: Request): Promise<Response> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = resolveToken(req)
  if (!token) {
    return new Response(JSON.stringify({ message: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Forward to backend SSE ────────────────────────────────────────────────
  const upstreamUrl = `${env.API_BASE_URL}/stats/stream`

  let upstreamResponse: Response
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        accept: 'text/event-stream',
        authorization: `Bearer ${token}`,
        'X-API-Key': env.BACKEND_API_KEY,
        'Cache-Control': 'no-cache',
      },
      // Keep the upstream connection alive for the full SSE lifetime
      signal: controller.signal,
      // @ts-expect-error – Next.js / node-fetch extended option
      duplex: 'half',
    })

    clearTimeout(timeout)
  } catch (err) {
    const message = err instanceof Error && err.name === 'AbortError'
      ? 'Backend SSE timed out'
      : 'Backend tidak merespons'
    return new Response(
      // Send a terminal SSE error event so the client can display feedback
      `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
      {
        status: 200, // keep 200 so EventSource stays open for one final read
        headers: sseHeaders(),
      },
    )
  }

  if (!upstreamResponse.ok) {
    let message = `API error (${upstreamResponse.status})`
    try {
      const body = (await upstreamResponse.json()) as { detail?: string; message?: string }
      message = body?.detail ?? body?.message ?? message
    } catch {
      // ignore parse errors
    }
    return new Response(
      `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
      { status: 200, headers: sseHeaders() },
    )
  }

  // ── Pipe upstream body straight to client ─────────────────────────────────
  if (!upstreamResponse.body) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ message: 'No stream body from backend' })}\n\n`,
      { status: 200, headers: sseHeaders() },
    )
  }

  return new Response(upstreamResponse.body, {
    status: 200,
    headers: sseHeaders(),
  })
}

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}
