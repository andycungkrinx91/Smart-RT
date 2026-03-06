'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Newspaper, Info, Palette, ChevronUp, Menu as MenuIcon, BookOpen, BookMarked, Clock3 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

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
    id: 'fitur',
    label: 'Fitur',
    icon: MenuIcon,
    side: 'left',
    children: [
      { href: '/quran', label: 'Al Quran', icon: BookOpen },
      { href: '/hadist', label: 'Hadist', icon: BookMarked },
    ],
  },
  {
    id: 'setting',
    label: 'Setting',
    icon: Palette,
    side: 'right',
    children: [
      { href: '/settings/theme', label: 'Tema', icon: Palette },
      { href: '/about', label: 'Tentang Kami', icon: Info },
    ],
  },
]

function isRouteActive(pathname: string, href: string) {
  if (href === '/') return pathname === href
  return pathname.startsWith(href)
}

export default function BottomNav() {
  const pathname = usePathname()
  const [menuState, setMenuState] = useState<{ id: string | null; pathname: string }>({
    id: null,
    pathname,
  })
  const openMenuId = menuState.pathname === pathname ? menuState.id : null

  const activeRootId = useMemo(() => {
    return rootItems.find((item) => item.children.some((child) => isRouteActive(pathname, child.href)))?.id ?? null
  }, [pathname])

  const openMenu = useMemo(() => {
    return rootItems.find((item) => item.id === openMenuId) ?? null
  }, [openMenuId])

  const isDashboardActive = pathname === '/'
  const isBlogActive = isRouteActive(pathname, '/blogs')
  const isShalatActive = isRouteActive(pathname, '/shalat')

  const fiturMenu = rootItems[0]!
  const settingMenu = rootItems[1]!
  const FiturIcon = fiturMenu.icon
  const SettingIcon = settingMenu.icon
  const isFiturActive = activeRootId === fiturMenu.id || openMenuId === fiturMenu.id
  const isSettingActive = activeRootId === settingMenu.id || openMenuId === settingMenu.id

  function toggleMenu(menuId: string) {
    setMenuState((prev) => ({
      pathname,
      id: prev.pathname === pathname && prev.id === menuId ? null : menuId,
    }))
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 max-w-full overflow-hidden lg:hidden" aria-label="Navigasi bawah">
      <div className="relative w-full max-w-full overflow-x-hidden px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)]">
        <AnimatePresence>
          {openMenu && (
            <motion.div
              key={openMenu.id}
              className={`absolute bottom-full mb-2 z-20 w-[calc(100vw-24px)] max-w-[18rem] ${openMenu.side === 'left' ? 'left-2' : 'right-2'}`}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            >
              <div className="flex max-h-[75vh] flex-col rounded-2xl border border-slate-700/50 bg-[#0b1224]/95 p-3 shadow-2xl backdrop-blur-md">
                <p className="px-2 pb-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-400">{openMenu.label}</p>
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex w-full max-w-full items-end justify-between gap-1 rounded-2xl border border-slate-800 bg-[#0a1020]/95 px-1.5 pb-1.5 pt-1 shadow-[0_-8px_28px_rgba(0,0,0,0.4)] backdrop-blur"
        >
          <Link
            href="/blogs"
            aria-current={isBlogActive ? 'page' : undefined}
            className={`group relative flex min-h-[4rem] basis-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition ${
              isBlogActive
                ? 'bg-[var(--color-brand)] text-white shadow-lg'
                : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            <Newspaper className={`h-6 w-6 ${isBlogActive ? 'text-white' : 'text-slate-400'}`} aria-hidden="true" />
            <span>Blog</span>
          </Link>

          <button
            type="button"
            onClick={() => toggleMenu(fiturMenu.id)}
            aria-expanded={openMenuId === fiturMenu.id}
            className={`group relative flex min-h-[4rem] basis-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition ${
              isFiturActive
                ? 'bg-[var(--color-brand)] text-white shadow-lg'
                : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            <FiturIcon className={`h-6 w-6 ${isFiturActive ? 'text-white' : 'text-slate-400'}`} aria-hidden="true" />
            <span>{fiturMenu.label}</span>
            <ChevronUp
              className={`absolute right-1 top-1 h-3 w-3 transition-transform ${
                openMenuId === fiturMenu.id ? 'rotate-180 text-white' : 'text-slate-500'
              }`}
              aria-hidden="true"
            />
          </button>

          <Link href="/" aria-current={isDashboardActive ? 'page' : undefined} className="relative -mt-5 flex min-w-[3.75rem] shrink-0 flex-col items-center justify-end px-1">
            <motion.span
              whileTap={{ scale: 0.92 }}
              animate={isDashboardActive ? { scale: 1.08 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 21 }}
              className={`relative flex size-[3.75rem] items-center justify-center rounded-full text-white ring-[3px] ring-[#0a1020] shadow-[0_12px_30px_rgba(0,0,0,0.5)] ${
                isDashboardActive ? 'bg-[var(--color-brand)]' : 'bg-slate-700'
              }`}
            >
              <LayoutDashboard className="h-7 w-7" aria-hidden="true" />
              {isDashboardActive ? (
                <motion.span
                  className="absolute inset-0 rounded-full border border-white/60"
                  animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
                />
              ) : null}
            </motion.span>
            <span className={`text-[11px] font-semibold ${isDashboardActive ? 'text-[var(--color-brand)]' : 'text-slate-400'}`}>Beranda</span>
          </Link>

          <Link
            href="/shalat"
            aria-current={isShalatActive ? 'page' : undefined}
            className={`group relative flex min-h-[4rem] basis-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition ${
              isShalatActive
                ? 'bg-[var(--color-brand)] text-white shadow-lg'
                : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            <Clock3 className={`h-6 w-6 ${isShalatActive ? 'text-white' : 'text-slate-400'}`} aria-hidden="true" />
            <span className="text-center leading-tight">Waktu Shalat</span>
          </Link>

          <button
            type="button"
            onClick={() => toggleMenu(settingMenu.id)}
            aria-expanded={openMenuId === settingMenu.id}
            className={`group relative flex min-h-[4rem] basis-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition ${
              isSettingActive
                ? 'bg-[var(--color-brand)] text-white shadow-lg'
                : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            <SettingIcon className={`h-6 w-6 ${isSettingActive ? 'text-white' : 'text-slate-400'}`} aria-hidden="true" />
            <span>{settingMenu.label}</span>
            <ChevronUp
              className={`absolute left-1 top-1 h-3 w-3 transition-transform ${
                openMenuId === settingMenu.id ? 'rotate-180 text-white' : 'text-slate-500'
              }`}
              aria-hidden="true"
            />
          </button>
        </motion.div>
      </div>
    </nav>
  )
}
