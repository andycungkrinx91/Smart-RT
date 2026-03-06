'use client'

/**
 * JakartaClock.tsx
 *
 * A real-time clock widget displaying WIB (Jakarta, UTC+7) time.
 *
 * Design:
 *  - Dark glass-morphism card with brand color glow
 *  - Large digit display with AnimatePresence flip per digit
 *  - Live pulsing "WIB" badge
 *  - Full Indonesian date label beneath
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useJakartaClock } from '@/hooks/useJakartaClock'
import { clockTickVariants } from '@/lib/motion-variants'

// ─── Single animated digit ────────────────────────────────────────────────────

function ClockDigit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex h-14 w-12 items-center justify-center overflow-hidden rounded-lg bg-white/8 ring-1 ring-white/12 sm:h-16 sm:w-14">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            variants={clockTickVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute text-2xl font-bold tabular-nums text-white sm:text-3xl"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </span>
    </div>
  )
}

// ─── Colon separator ─────────────────────────────────────────────────────────

function Colon({ pulse }: { pulse?: boolean }) {
  return (
    <motion.span
      className="mb-5 select-none text-2xl font-bold text-white/50 sm:text-3xl"
      animate={pulse ? { opacity: [1, 0.2, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
    >
      :
    </motion.span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function JakartaClock() {
  const { hours, minutes, seconds, dateLabel, timezone } = useJakartaClock()

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.05 }}
      className={`
        relative overflow-hidden rounded-xl
        bg-gradient-to-br from-[color-mix(in_srgb,var(--color-brand),black_35%)]
                          to-[color-mix(in_srgb,var(--color-brand),black_65%)]
        p-5 text-white
        shadow-[0_8px_32px_color-mix(in_srgb,var(--color-brand),transparent_55%)]
        ring-1 ring-white/10
      `}
    >
      {/* Ambient glow blob */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-20 blur-3xl"
        style={{ background: 'var(--color-brand)' }}
        aria-hidden="true"
      />

      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
          Waktu Sekarang
        </p>
        {/* Live WIB badge */}
        <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white/80 ring-1 ring-white/10">
          <motion.span
            className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          {timezone}
        </span>
      </div>

      {/* Clock face */}
      <div className="flex items-center gap-1.5">
        <ClockDigit value={hours} label="Jam" />
        <Colon pulse />
        <ClockDigit value={minutes} label="Mnt" />
        <Colon />
        <ClockDigit value={seconds} label="Dtk" />
      </div>

      {/* Date label */}
      <motion.p
        className="mt-4 text-[11px] font-medium text-white/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {dateLabel}
      </motion.p>
    </motion.div>
  )
}
