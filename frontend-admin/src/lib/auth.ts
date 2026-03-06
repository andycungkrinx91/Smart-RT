/**
 * Extracts the Bearer token from the incoming request's Authorization header.
 *
 * Returns the raw token string, or `null` if the header is absent or is not
 * a Bearer token.
 */
export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null

  const [scheme, token] = authHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null

  return token
}
