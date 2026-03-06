'use client'

/**
 * MetricCard.tsx
 *
 * Revamped stat card for Penduduk & KK metrics.
 *
 * Design:
 *  - Large brand-gradient icon badge with animated ring
 *  - Big animated number with blur-in tick effect on value change
 *  - Subtle sparkline bar pattern as decorative background
 *  - Hover: gentle lift + shadow intensify
 *  - Live pulse dot
 */

import type { LucideIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { metricCardVariants } from '@/lib/motion-variants'
import { useRef } from 'react'
import { useInView } from 'framer-motion'

// ─── Sparkline decorative bars ────────────────────────────────────────────────

const SPARK_HEIGHTS = [30, 55, 40, 70, 45, 85, 60, 90, 50, 75, 65, 100]

function SparklineDecor() {
  return (
    <div className="absolute bottom-0 right-0 flex h-16 items-end gap-[3px] px-4 pb-3 opacity-[0.06]" aria-hidden="true">
      {SPARK_HEIGHTS.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-t-sm"
          style={{
            height: `${h}%`,
            background: 'var(--color-brand)',
          }}
          initial={{ scaleY: 0, originY: 1 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.3 + i * 0.04, duration: 0.4, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricCardProps = {
  title: string
  subtitle?: string
  value: number
  icon: LucideIcon
  /** Stagger delay in seconds */
  delay?: number
  isLoading?: boolean
  /** Optional trend label e.g. "+12 bulan ini" */
  trend?: string
  trendUp?: boolean
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MetricCard({
  title,
  subtitle,
  value,
  icon: Icon,
  delay = 0,
  isLoading = false,
  trend,
  trendUp = true,
}: MetricCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })

  const formatted = new Intl.NumberFormat('id-ID').format(value)

  return (
    <motion.article
      ref={ref}
      variants={metricCardVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      custom={delay}
      transition={{ delay }}
      whileHover={{ y: -5, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="card relative overflow-hidden p-5"
    >
      {/* Decorative sparkline */}
      <SparklineDecor />

      {/* Top row: icon + live badge */}
      <div className="mb-4 flex items-start justify-between">
        <motion.div
          className={`
            relative flex size-12 items-center justify-center rounded-xl
            bg-gradient-to-br from-[color-mix(in_srgb,var(--color-brand),white_20%)]
                              to-[color-mix(in_srgb,var(--color-brand),black_10%)]
            text-white shadow-md
          `}
          whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.4 } }}
        >
          {/* Ambient ring */}
          <motion.span
            className="absolute inset-0 rounded-xl ring-2 ring-[color-mix(in_srgb,var(--color-brand),transparent_60%)]"
            animate={{ scale: [1, 1.12, 1], opacity: [0.8, 0.3, 0.8] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Icon className="relative z-10 h-5 w-5" aria-hidden="true" />
        </motion.div>

        {/* Live indicator */}
        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 ring-1 ring-emerald-200/70">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          Live
        </span>
      </div>

      {/* Label */}
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {title}
      </p>
      {subtitle && (
        <p className="text-[10px] text-slate-300 mt-0.5">{subtitle}</p>
      )}

      {/* Value */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            className="mt-2 h-10 w-28 rounded-md bg-slate-100 animate-pulse"
            exit={{ opacity: 0 }}
          />
        ) : (
          <motion.p
            key={value}
            initial={{ opacity: 0.3, scale: 0.94, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 text-4xl font-extrabold tabular-nums tracking-tight text-slate-900"
          >
            {formatted}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Trend chip */}
      {trend && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.4 }}
          className="mt-3"
        >
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              trendUp
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                : 'bg-red-50 text-red-600 ring-1 ring-red-200/60'
            }`}
          >
            <span>{trendUp ? '↑' : '↓'}</span>
            {trend}
          </span>
        </motion.div>
      )}
    </motion.article>
  )
}
