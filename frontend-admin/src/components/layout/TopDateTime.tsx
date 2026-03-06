'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clockTickVariants, neonPulseVariants } from '@/lib/motion-variants'

const JAKARTA_TIME_ZONE = 'Asia/Jakarta'

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: JAKARTA_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: JAKARTA_TIME_ZONE,
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function getTimeParts(now: Date) {
  const parts = timeFormatter.formatToParts(now)
  return {
    hour:   parts.find((p) => p.type === 'hour')?.value   ?? '00',
    minute: parts.find((p) => p.type === 'minute')?.value ?? '00',
    second: parts.find((p) => p.type === 'second')?.value ?? '00',
  }
}

/** Blinking colon — static for a cleaner feel */
function Colon({ second }: { second: string }) {
  return (
    <span
      className="select-none px-[1px] text-sky-300"
      aria-hidden="true"
    >
      :
    </span>
  )
}

/** Single digit group — animates only when the value changes */
function DigitGroup({ value, className }: { value: string; className?: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        variants={clockTickVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  )
}

export function TopDateTime() {
  const [now, setNow] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Hydrate only on client to avoid SSR mismatch
  useEffect(() => {
    // Use a microtask or timeout to avoid the "synchronous setState in effect" warning
    const initialTimer = setTimeout(() => {
      setNow(new Date())
    }, 0)

    intervalRef.current = setInterval(() => setNow(new Date()), 1000)
    
    return () => {
      clearTimeout(initialTimer)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const { hour, minute, second } = useMemo(
    () => (now ? getTimeParts(now) : { hour: '--', minute: '--', second: '--' }),
    [now],
  )
  const dateLabel = useMemo(
    () => (now ? dateFormatter.format(now) : ''),
    [now],
  )

  if (!now) {
    return (
      <div className="ml-auto h-[46px] w-[140px] rounded-xl border border-sky-400/20 bg-slate-800/40 backdrop-blur-md sm:h-[58px] sm:w-[180px]" />
    )
  }

  return (
    <motion.div
      className={[
        'ml-auto flex items-center gap-3',
        'rounded-xl border border-sky-400/30',
        'bg-gradient-to-br from-slate-800/60 via-sky-900/40 to-slate-900/70',
        'px-3.5 py-2 sm:px-4',
        'backdrop-blur-md ring-1 ring-white/10',
        'shadow-[0_0_18px_rgba(56,189,248,0.12)]',
      ].join(' ')}
      variants={neonPulseVariants}
      initial="initial"
      animate="animate"
      role="status"
      aria-live="polite"
      aria-label={`Waktu Jakarta ${hour}:${minute}:${second}, ${dateLabel} WIB`}
    >
      {/* Static neon dot indicator */}
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
      </span>

      <div className="flex flex-col items-end leading-none">
        {/* Time row */}
        <div
          className={[
            'flex items-center font-mono font-black tabular-nums tracking-[0.04em]',
            'text-sky-50',
            '[text-shadow:0_0_8px_rgba(186,230,253,0.9),0_0_20px_rgba(56,189,248,0.6)]',
          ].join(' ')}
        >
          <DigitGroup value={hour}   className="text-[15px] sm:text-[20px]" />
          <Colon second={second} />
          <DigitGroup value={minute} className="text-[15px] sm:text-[20px]" />
          <Colon second={second} />
          {/* Second is always animated */}
          <DigitGroup
            value={second}
            className="text-[13px] text-sky-300 sm:text-[17px] [text-shadow:0_0_10px_rgba(125,211,252,0.9)]"
          />
        </div>

        {/* Date row */}
        <div className="mt-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-sky-200/80 sm:text-[10.5px]">
          {dateLabel}{' '}
          <span className="font-black text-emerald-300 [text-shadow:0_0_8px_rgba(52,211,153,0.7)]">
            WIB
          </span>
        </div>
      </div>
    </motion.div>
  )
}
