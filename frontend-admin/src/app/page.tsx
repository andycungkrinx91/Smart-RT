import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SESSION_COOKIE_NAME = 'srt_session'

export default async function RootPage() {
  const cookieStore = await cookies()
  const hasSession = Boolean(cookieStore.get(SESSION_COOKIE_NAME)?.value)
  redirect(hasSession ? '/admin' : '/login')
}
