'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Database,
  Users,
  FileText,
  Wallet,
  Landmark,
  Wrench,
  User,
  Newspaper,
  CalendarDays,
  Settings,
  Palette,
  Sparkles,
  ChevronRight,
  Receipt,
  UserCircle,
  Layout,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogoutButton } from './LogoutButton'
import {
  dropdownItemVariants,
  dropdownVariants,
  sidebarItemVariants,
  sidebarVariants,
} from '@/lib/motion-variants'

type SubItem = { href: string; label: string; icon: LucideIcon }
type MenuGroup = {
  id: string
  label: string
  icon: LucideIcon
  children: SubItem[]
}

const navGroups: MenuGroup[] = [
  {
    id: 'kelola-data',
    label: 'Kelola Data',
    icon: Database,
    children: [
      { href: '/admin/penduduk', label: 'Data Penduduk', icon: Users },
      { href: '/admin/kk', label: 'Data Kartu Keluarga', icon: FileText },
      { href: '/admin/pengguna', label: 'Data Pengguna', icon: User },
    ],
  },
  {
    id: 'keuangan',
    label: 'Keuangan',
    icon: Wallet,
    children: [
      { href: '/admin/keuangan', label: 'Data Keuangan RT', icon: Landmark },
      { href: '/admin/iuran', label: 'Data Iuran Warga', icon: Receipt },
    ],
  },
  {
    id: 'utilitas',
    label: 'Utilitas',
    icon: Wrench,
    children: [
      { href: '/admin/blog', label: 'Blogs', icon: Newspaper },
      { href: '/admin/kegiatan', label: 'Jadwal Kegiatan', icon: CalendarDays },
    ],
  },
  {
    id: 'pengaturan',
    label: 'Pengaturan',
    icon: Settings,
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

function SidebarGroup({
  group,
  isOpen,
  onToggle,
}: {
  group: MenuGroup
  isOpen: boolean
  onToggle: (id: string) => void
}) {
  const pathname = usePathname()
  const GroupIcon = group.icon
  const childActive = group.children.some((child) => isRouteActive(pathname, child.href))

  return (
    <motion.div variants={sidebarItemVariants} className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => onToggle(group.id)}
        aria-expanded={isOpen}
        aria-controls={`sidebar-${group.id}`}
        style={
          childActive
            ? {
                backgroundColor: 'color-mix(in srgb, var(--color-brand), black 26%)',
              }
            : undefined
        }
        className={`
          group relative flex w-full items-center gap-3 rounded-xl px-3 py-3
          text-[13.5px] font-semibold tracking-[0.01em] transition-all duration-200
          ${
            childActive
              ? 'text-white'
              : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
          }
        `}
      >
        <GroupIcon
          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
            childActive ? 'text-white' : 'text-white/70 group-hover:text-white'
          }`}
          aria-hidden="true"
        />
        <span className="flex-1 text-left">{group.label}</span>

        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 290, damping: 22 }}
          className={childActive ? 'text-white/85' : 'text-white/45'}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`sidebar-${group.id}`}
            variants={dropdownVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="overflow-hidden px-2 pb-2"
          >
            <div className="ml-5 space-y-1 border-l border-white/20 pl-3">
              {group.children.map((child) => {
                const ChildIcon = child.icon
                const active = isRouteActive(pathname, child.href)
                return (
                  <motion.div key={child.href} variants={dropdownItemVariants}>
                    <Link
                      href={child.href}
                      aria-current={active ? 'page' : undefined}
                      style={
                        active
                          ? {
                              backgroundColor: 'color-mix(in srgb, var(--color-brand), black 18%)',
                            }
                          : undefined
                      }
                      className={`
                        flex items-center gap-2.5 rounded-lg px-2.5 py-2
                        text-[12.5px] font-medium transition-all duration-200
                        ${
                          active
                            ? 'text-white'
                            : 'text-white/70 hover:bg-white/[0.07] hover:text-white'
                        }
                      `}
                    >
                      <ChildIcon
                        className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-white' : 'text-white/55'}`}
                        aria-hidden="true"
                      />
                      <span>{child.label}</span>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const isDashboardActive = pathname === '/admin'

  const activeGroupId = useMemo(() => {
    return navGroups.find((group) => group.children.some((child) => isRouteActive(pathname, child.href)))?.id ?? null
  }, [pathname])

  useEffect(() => {
    setOpenGroupId(activeGroupId)
  }, [activeGroupId])

  function handleToggle(id: string) {
    setOpenGroupId((prev) => (prev === id ? null : id))
  }

  return (
    <motion.div
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      className="flex h-full w-full flex-col border-r border-white/10 px-3 py-6 text-white"
      style={{
        background:
          'radial-gradient(125% 120% at 0% 0%, color-mix(in srgb, var(--color-brand), black 40%) 0%, color-mix(in srgb, var(--color-brand), black 52%) 42%, color-mix(in srgb, var(--color-brand), black 68%) 100%)',
      }}
    >
      <motion.div variants={sidebarItemVariants} className="mb-8 px-2">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-xl text-white shadow-lg shadow-black/35 ring-1 ring-white/20"
            style={{
              background:
                'linear-gradient(135deg, var(--color-brand) 0%, color-mix(in srgb, var(--color-brand), black 32%) 100%)',
            }}
          >
            <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
          <div>
            <div className="text-[16px] font-semibold tracking-tight text-white">Smart-RT</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
              Admin Panel
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={sidebarItemVariants} className="mb-2">
        <Link
          href="/admin"
          aria-current={isDashboardActive ? 'page' : undefined}
          style={
            isDashboardActive
              ? {
                  backgroundColor: 'color-mix(in srgb, var(--color-brand), black 24%)',
                }
              : undefined
          }
          className={`
            group relative flex items-center gap-3 rounded-xl px-3 py-3
            text-[13.5px] font-semibold transition-all duration-200
            ${
              isDashboardActive
                ? 'text-white'
                : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
            }
          `}
        >
          {isDashboardActive ? (
            <motion.span
              layoutId="sidebar-dashboard-indicator"
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-brand)]"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.2 }}
            />
          ) : null}
          <LayoutDashboard
            className={`h-[18px] w-[18px] shrink-0 transition-colors ${
              isDashboardActive ? 'text-white' : 'text-white/70 group-hover:text-white'
            }`}
            aria-hidden="true"
          />
          <span>Dashboard</span>
        </Link>
      </motion.div>

      <motion.div variants={sidebarItemVariants}>
        <div className="mx-2 mb-4 mt-2 border-t border-white/10" />
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
          Main Menu
        </p>
      </motion.div>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
        {navGroups.map((group) => (
          <SidebarGroup
            key={group.id}
            group={group}
            isOpen={openGroupId === group.id}
            onToggle={handleToggle}
          />
        ))}
      </nav>

      <motion.div
        variants={sidebarItemVariants}
        className="mt-6 space-y-4 border-t border-white/10 pt-5"
      >
        <LogoutButton className="group flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-[linear-gradient(120deg,var(--color-brand),color-mix(in_srgb,var(--color-brand),black_35%))] px-3 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110" />
        <div className="text-center text-[11px] font-medium leading-relaxed text-white/55">
          <div>Andy Setiyawan 2026 ™</div>
          <div className="mt-0.5">Smart RT Workspace</div>
        </div>
      </motion.div>
    </motion.div>
  )
}
