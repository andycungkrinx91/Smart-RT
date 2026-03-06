/**
 * motion-variants.ts
 * ─────────────────────────────────────────────────
 * Centralized Framer Motion variants for Smart-RT Admin.
 * "Rich animation" feel: orchestrated stagger, spring physics,
 * directional slide-ins, and elastic hover/tap states.
 */

import type { Variants } from 'framer-motion'

// ─── Page / Container ────────────────────────────────────────────────────────

export const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
}

// ─── Staggered Children ───────────────────────────────────────────────────────

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}

export const fadeDownVariants: Variants = {
  hidden: { opacity: 0, y: -18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
}

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 280, damping: 22 },
  },
}

// ─── Directional Slide-ins ────────────────────────────────────────────────────

/** Left side — 'Kelola Data' & 'Keuangan' */
export const slideFromLeftVariants: Variants = {
  hidden: { opacity: 0, x: -36 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 320, damping: 26 },
  },
  exit: { opacity: 0, x: -28, transition: { duration: 0.2 } },
}

/** Right side — 'Utilitas' & 'Pengaturan' */
export const slideFromRightVariants: Variants = {
  hidden: { opacity: 0, x: 36 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 320, damping: 26 },
  },
  exit: { opacity: 0, x: 28, transition: { duration: 0.2 } },
}

/** Bottom-nav center bubble — floats up with a bounce */
export const floatUpVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.75 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 380, damping: 20, delay: 0.05 },
  },
}

// ─── Not Found: Serene Snowdrops ─────────────────────────────────────────────

export const snowdropVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.86 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: [0, -1.4, 1.2, -1.1, 0],
    transition: {
      opacity: { duration: 0.45, delay: index * 0.08 },
      y: { type: 'spring', stiffness: 240, damping: 20, delay: index * 0.08 },
      rotate: {
        duration: 4.8,
        ease: 'easeInOut',
        repeat: Number.POSITIVE_INFINITY,
        delay: index * 0.28,
      },
    },
  }),
}

export const floatingElementVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (index: number = 0) => ({
    opacity: 1,
    scale: 1,
    y: [0, index % 2 === 0 ? -12 : 10, 0],
    x: [0, index % 2 === 0 ? 10 : -8, 0],
    transition: {
      opacity: { duration: 0.55, delay: 0.1 + index * 0.08 },
      scale: { type: 'spring', stiffness: 220, damping: 22, delay: 0.08 + index * 0.05 },
      y: {
        duration: 5.2 + index * 0.45,
        ease: 'easeInOut',
        repeat: Number.POSITIVE_INFINITY,
      },
      x: {
        duration: 6.1 + index * 0.4,
        ease: 'easeInOut',
        repeat: Number.POSITIVE_INFINITY,
      },
    },
  }),
}

// ─── Sidebar Dropdown ─────────────────────────────────────────────────────────

export const dropdownVariants: Variants = {
  closed: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  open: {
    opacity: 1,
    height: 'auto',
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.045,
      delayChildren: 0.04,
    },
  },
}

export const dropdownItemVariants: Variants = {
  closed: { opacity: 0, x: -10 },
  open: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
}

// ─── Sidebar itself ───────────────────────────────────────────────────────────

export const sidebarVariants: Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.07,
      delayChildren: 0.15,
    },
  },
}

export const sidebarItemVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
}

// ─── Metric / Stat Cards ──────────────────────────────────────────────────────

export const cardContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.12,
    },
  },
}

export const metricCardVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 22 },
  },
}

/** Number tick-up animation keyframe variant */
export const numberTickVariants: Variants = {
  initial: { opacity: 0.3, scale: 0.94, filter: 'blur(4px)' },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
}

// ─── Donut Chart Sections ─────────────────────────────────────────────────────

export const donutRevealVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, rotate: -15 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 200, damping: 20, delay: 0.2 },
  },
}

// ─── Clock ────────────────────────────────────────────────────────────────────

export const clockTickVariants: Variants = {
  initial: { opacity: 0, y: -6, scale: 0.92 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.92,
    transition: { duration: 0.12, ease: [0.22, 1, 0.36, 1] },
  },
}

export const neonPulseVariants: Variants = {
  initial: {
    boxShadow:
      '0 0 0 1px rgba(186, 230, 253, 0.35), 0 0 14px rgba(14, 165, 233, 0.18), inset 0 0 10px rgba(255, 255, 255, 0.18)',
  },
  animate: {
    boxShadow:
      '0 0 0 1px rgba(186, 230, 253, 0.35), 0 0 14px rgba(14, 165, 233, 0.18), inset 0 0 10px rgba(255, 255, 255, 0.18)',
  },
}

// ─── Generic hover / tap ──────────────────────────────────────────────────────

export const hoverLift = {
  whileHover: { y: -3, scale: 1.01, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
  whileTap: { scale: 0.97, transition: { duration: 0.1 } },
}

export const hoverGlow = {
  whileHover: { scale: 1.05, transition: { type: 'spring', stiffness: 400, damping: 18 } },
  whileTap: { scale: 0.95, transition: { duration: 0.1 } },
}
