import Link from 'next/link'
import { AdminBottomNav } from '@/components/layout/AdminBottomNav'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { TopDateTime } from '@/components/layout/TopDateTime'
import { AuthGuard } from '@/components/auth/AuthGuard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white text-slate-700">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block">
          <AdminSidebar />
        </aside>
        <div className="flex min-h-screen flex-col lg:ml-72">
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 bg-[color-mix(in_srgb,var(--color-brand),white_20%)] px-4 text-white shadow-header lg:px-8">
            <Link href="/admin" className="shrink-0 text-sm font-semibold tracking-tight text-white sm:text-base">
              Smart-RT Admin
            </Link>
            <TopDateTime />
          </header>
          <main className="flex-1 overflow-y-auto bg-[linear-gradient(to_bottom_right,#ffffff,var(--color-brand-light))] p-4 pb-28 lg:p-8 lg:pb-8">
            {children}
          </main>
          <AdminBottomNav />
        </div>
      </div>
    </AuthGuard>
  )
}
