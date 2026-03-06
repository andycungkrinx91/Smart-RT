'use client'

/**
 * DonutChart.tsx
 *
 * A pure-SVG animated donut chart showing Active vs Inactive ratios.
 * No recharts dependency — clean, lightweight, and fully animated with
 * Framer Motion SVG path animation (strokeDashoffset reveal).
 *
 * Usage:
 *   <DonutChart
 *     title="Pengguna"
 *     icon={User}
 *     total={120}
 *     active={98}
 *     inactive={22}
 *     delay={0}
 *   />
 */

import { useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { metricCardVariants } from '@/lib/motion-variants'

// ─── Types ────────────────────────────────────────────────────────────────────

type DonutChartProps = {
  title: string
  icon: LucideIcon
  /** Total count */
  total: number
  /** Count with status "active" */
  active: number
  /** Count with status "inactive" */
  inactive: number
  /** Stagger delay in seconds */
  delay?: number
}

// ─── SVG Donut ────────────────────────────────────────────────────────────────

const R = 38      // radius
const CX = 50
const CY = 50
const CIRCUMFERENCE = 2 * Math.PI * R
const STROKE_W = 11
const GAP = 2     // gap between segments in px

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToCartesian(cx, cy, r, startDeg)
  const e = polarToCartesian(cx, cy, r, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

type ArcSegmentProps = {
  startDeg: number
  endDeg: number
  color: string
  shouldAnimate: boolean
  delay: number
}

function ArcSegment({ startDeg, endDeg, color, shouldAnimate, delay }: ArcSegmentProps) {
  const spanDeg = endDeg - startDeg
  if (spanDeg <= 0) return null

  const gapDeg = (GAP / (2 * Math.PI * R)) * 360
  const adjStart = startDeg + gapDeg / 2
  const adjEnd = endDeg - gapDeg / 2
  if (adjEnd <= adjStart) return null

  // Use strokeDasharray/strokeDashoffset trick on a full-circle path
  // for a smooth reveal — much simpler than animating path d.
  const pathLength = ((adjEnd - adjStart) / 360) * CIRCUMFERENCE

  return (
    <motion.path
      d={arcPath(CX, CY, R, adjStart, adjEnd)}
      fill="none"
      stroke={color}
      strokeWidth={STROKE_W}
      strokeLinecap="round"
      pathLength={1}
      initial={{ pathLength: shouldAnimate ? 0 : 1, opacity: shouldAnimate ? 0 : 1 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{
        pathLength: { delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] },
        opacity: { delay, duration: 0.2 },
      }}
    />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DonutChart({ title, icon: Icon, total, active, inactive, delay = 0 }: DonutChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  const activeRatio = total > 0 ? active / total : 0
  const inactiveRatio = total > 0 ? inactive / total : 0

  const activeDeg = activeRatio * 360
  const inactiveDeg = inactiveRatio * 360

  // Active arc: starts at top (0°)
  const activeStart = 0
  const activeEnd = activeDeg

  // Inactive arc: starts right after active
  const inactiveStart = activeEnd
  const inactiveEnd = activeEnd + inactiveDeg

  // Remainder (if total doesn't sum to 100%)
  const hasRemainder = inactiveEnd < 358

  const activePercent = Math.round(activeRatio * 100)

  return (
    <motion.article
      ref={ref}
      variants={metricCardVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      custom={delay}
      transition={{ delay }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
      className="card p-5 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand),transparent_85%)] text-[color-mix(in_srgb,var(--color-brand),black_10%)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
          <p className="text-[11px] text-slate-400/70">Aktif vs Tidak Aktif</p>
        </div>
      </div>

      {/* SVG Donut */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-6" aria-hidden="true">
            {/* Track */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE_W}
              className="text-slate-100"
            />

            {/* Remainder track */}
            {hasRemainder && (
              <path
                d={arcPath(CX, CY, R, inactiveEnd, 360)}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE_W}
                strokeLinecap="round"
                className="text-slate-100"
              />
            )}

            {/* Inactive segment */}
            <ArcSegment
              startDeg={inactiveStart}
              endDeg={inactiveEnd}
              color="#f87171"
              shouldAnimate={inView}
              delay={delay + 0.15}
            />

            {/* Active segment */}
            <ArcSegment
              startDeg={activeStart}
              endDeg={activeEnd}
              color="var(--color-brand)"
              shouldAnimate={inView}
              delay={delay}
            />
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={total}
              initial={{ opacity: 0.3, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-lg font-bold tabular-nums text-slate-800"
            >
              {new Intl.NumberFormat('id-ID').format(total)}
            </motion.span>
            <span className="text-[9px] font-semibold text-slate-400">TOTAL</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 min-w-0">
          <LegendRow
            color="var(--color-brand)"
            label="Aktif"
            value={active}
            percent={activePercent}
          />
          <LegendRow
            color="#f87171"
            label="Non-Aktif"
            value={inactive}
            percent={100 - activePercent}
          />
        </div>
      </div>
    </motion.article>
  )
}

// ─── Legend Row ───────────────────────────────────────────────────────────────

function LegendRow({
  color,
  label,
  value,
  percent,
}: {
  color: string
  label: string
  value: number
  percent: number
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span className="truncate text-[11px] font-medium text-slate-500">{label}</span>
        <span className="ml-auto shrink-0 text-[11px] font-bold tabular-nums text-slate-700">
          {new Intl.NumberFormat('id-ID').format(value)}
        </span>
      </div>
      {/* Mini progress bar */}
      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
      </div>
    </div>
  )
}
