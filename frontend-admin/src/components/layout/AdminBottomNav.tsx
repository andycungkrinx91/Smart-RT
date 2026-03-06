'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Database,
  Users,
  FileText,
  Wallet,
  Landmark,
  Receipt,
  Wrench,
  Newspaper,
  CalendarDays,
  Settings,
  UserCircle,
  Palette,
  Layout,
  ChevronUp,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { LogoutButton } from './LogoutButton'

type SubItem = { href: string; label: string; icon: LucideIcon }
type RootItem = {
  id: string
  label: string
  icon: LucideIcon
  side: 'left' | 'right'
  children: SubItem[]
}

const rootItems: RootItem[] = [
  {
    id: 'kelola-data',
    label: 'Kelola Data',
    icon: Database,
    side: 'left',
    children: [
      { href: '/admin/penduduk', label: 'Penduduk', icon: Users },
      { href: '/admin/kk', label: 'Kartu Keluarga', icon: FileText },
      { href: '/admin/pengguna', label: 'Pengguna', icon: Wrench },
    ],
  },
  {
    id: 'keuangan',
    label: 'Keuangan',
    icon: Wallet,
    side: 'left',
    children: [
      { href: '/admin/keuangan', label: 'Keuangan RT', icon: Landmark },
      { href: '/admin/iuran', label: 'Iuran Warga', icon: Receipt },
    ],
  },
  {
    id: 'utilitas',
    label: 'Utilitas',
    icon: Wrench,
    side: 'right',
    children: [
      { href: '/admin/blog', label: 'Blog', icon: Newspaper },
      { href: '/admin/kegiatan', label: 'Jadwal', icon: CalendarDays },
    ],
  },
  {
    id: 'pengaturan',
    label: 'Pengaturan',
    icon: Settings,
    side: 'right',
    children: [
      { href: '/admin/profile', label: 'Profil', icon: UserCircle },
      { href: '/admin/pengaturan', label: 'Tema', icon: Palette },
      { href: '/admin/pengaturan/homepage', label: 'Homepage', icon: Layout },
      { href: '/admin/pengaturan/about', label: 'Tentang', icon: Layout },
    ],
  },
]

function isRouteActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === href
  return pathname.startsWith(href)
}

export function AdminBottomNav() {
  const pathname = usePathname()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Reset menu when pathname changes using the "Adjusting state when a prop changes" pattern
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpenMenuId(null)
  }

  const activeRootId = useMemo(() => {
    return rootItems.find((item) => item.children.some((child) => isRouteActive(pathname, child.href)))?.id ?? null
  }, [pathname])

  const openMenu = useMemo(() => {
    return rootItems.find((item) => item.id === openMenuId) ?? null
  }, [openMenuId])

  const isDashboardActive = pathname === '/admin'

  function toggleMenu(menuId: string) {
    setOpenMenuId((prev) => (prev === menuId ? null : menuId))
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div className="relative mx-auto w-full max-w-screen-sm">
        <AnimatePresence>
          {openMenu && (
            <motion.div
              key={openMenu.id}
              className={`absolute bottom-full mb-1.5 z-20 w-[min(92vw,22rem)] ${
                openMenu.side === 'left' ? 'left-2' : 'right-2'
              }`}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            >
              <div className="flex max-h-[75vh] flex-col rounded-2xl border border-slate-700/50 bg-[#0b1224]/95 p-3 shadow-2xl backdrop-blur-md">
                <p className="px-2 pb-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-400">
                  {openMenu.label}
                </p>
                <div className="flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
                  {openMenu.children.map((child, index) => {
                    const ChildIcon = child.icon
                    const active = isRouteActive(pathname, child.href)
                    return (
                      <motion.div
                        key={child.href}
                        initial={{ opacity: 0, x: openMenu.side === 'left' ? -12 : 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.2 }}
                      >
                        <Link
                          href={child.href}
                          aria-current={active ? 'page' : undefined}
                          className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold transition-colors ${
                            active
                              ? 'bg-[var(--color-brand)] text-white shadow-md'
                              : 'text-slate-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <ChildIcon className={`h-6 w-6 ${active ? 'text-white' : 'text-slate-400'}`} aria-hidden="true" />
                          {child.label}
                        </Link>
                      </motion.div>
                    )
                  })}
                  
                  {openMenu.id === 'pengaturan' && (
                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: openMenu.children.length * 0.04, duration: 0.2 }}
                      className="mt-2 border-t border-slate-700/50 pt-2"
                    >
                      <LogoutButton className="group flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300" />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="grid grid-cols-5 items-end gap-1 rounded-t-2xl border-t border-slate-800 bg-[#0a1020] p-0 shadow-[0_-8px_28px_rgba(0,0,0,0.4)]"
        >
          {rootItems.slice(0, 2).map((item) => {
            const Icon = item.icon
            const isActive = activeRootId === item.id || openMenuId === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleMenu(item.id)}
                aria-expanded={openMenuId === item.id}
                className={`group relative flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-xl px-1 text-[13px] font-semibold transition ${
                  isActive
                    ? 'bg-[var(--color-brand)] text-white shadow-lg'
                    : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-7 w-7 ${isActive ? 'text-white' : 'text-slate-400'}`} aria-hidden="true" />
                <span>{item.label}</span>
                <ChevronUp
                  className={`absolute right-1 top-1 h-4 w-4 transition-transform ${
                    openMenuId === item.id ? 'rotate-180 text-white' : 'text-slate-500'
                  }`}
                  aria-hidden="true"
                />
              </button>
            )
          })}

          <Link
            href="/admin"
            aria-current={isDashboardActive ? 'page' : undefined}
            className="relative -mt-7 flex flex-col items-center justify-end gap-2"
          >
            <motion.span
              whileTap={{ scale: 0.92 }}
              animate={isDashboardActive ? { scale: 1.08 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 21 }}
              className={`relative flex size-[4.25rem] items-center justify-center rounded-full text-white ring-[4px] ring-[#0a1020] shadow-[0_12px_30px_rgba(0,0,0,0.5)] ${
                isDashboardActive ? 'bg-[var(--color-brand)]' : 'bg-slate-700'
              }`}
            >
              <LayoutDashboard className="h-8 w-8" aria-hidden="true" />
              {isDashboardActive ? (
                <motion.span
                  className="absolute inset-0 rounded-full border border-white/60"
                  animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
                />
              ) : null}
            </motion.span>
            <span className={`text-[13px] font-semibold ${isDashboardActive ? 'text-[var(--color-brand)]' : 'text-slate-400'}`}>
              Dashboard
            </span>
          </Link>

          {rootItems.slice(2).map((item) => {
            const Icon = item.icon
            const isActive = activeRootId === item.id || openMenuId === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleMenu(item.id)}
                aria-expanded={openMenuId === item.id}
                className={`group relative flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-xl px-1 text-[13px] font-semibold transition ${
                  isActive
                    ? 'bg-[var(--color-brand)] text-white shadow-lg'
                    : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-7 w-7 ${isActive ? 'text-white' : 'text-slate-400'}`} aria-hidden="true" />
                <span>{item.label}</span>
                <ChevronUp
                  className={`absolute left-1 top-1 h-4 w-4 transition-transform ${
                    openMenuId === item.id ? 'rotate-180 text-white' : 'text-slate-500'
                  }`}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </motion.div>
      </div>
    </nav>
  )
}
