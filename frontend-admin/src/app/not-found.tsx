'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useThemeColor } from '@/hooks/useThemeColor'

// ─── Colour Utilities ────────────────────────────────────────────────────────

/** Parse a 6-digit hex string into { r, g, b }. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

/** Convert { r, g, b } back to a hex string. */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
      .join('')
  )
}

/** Darken a hex colour by a factor (0 = black, 1 = original). */
function darken(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r * factor, g * factor, b * factor)
}

/** Lighten a hex colour by blending with white. */
function lighten(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor,
  )
}

/** Produce an `rgba(…)` string from a hex + alpha. */
function hexAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

function createSeededRandom(seed: number) {
  let t = seed || 1
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotFound() {
  const { themeColor } = useThemeColor()

  // Derived theme palette – memoised so it only recalculates when themeColor changes
  const palette = useMemo(() => {
    const bg1 = darken(themeColor, 0.08)   // very dark – near-black with a hue tint
    const bg2 = darken(themeColor, 0.14)   // slightly less dark for gradient stop
    const bodyPrimary = themeColor          // character body
    const bodyLight = lighten(themeColor, 0.6) // pale belly
    const bodyDark = darken(themeColor, 0.5)   // wing strokes / shading
    const glow = hexAlpha(themeColor, 0.45)    // button glow
    const glowHover = hexAlpha(themeColor, 0.65)
    const signShadow = darken(themeColor, 0.3)
    const buttonBg = lighten(themeColor, 0.15)
    const buttonHover = lighten(themeColor, 0.3)
    return {
      bg1,
      bg2,
      bodyPrimary,
      bodyLight,
      bodyDark,
      glow,
      glowHover,
      signShadow,
      buttonBg,
      buttonHover,
    }
  }, [themeColor])

  const seed = useMemo(() => parseInt(themeColor.replace('#', ''), 16) || 1, [themeColor])

  const snowflakes = useMemo(() => {
    const rand = createSeededRandom(seed)
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      xStart: rand() * 150 - 25,
      size: rand() * 8 + 4,
      duration: rand() * 0.6 + 0.3,
      delay: rand() * -2,
    }))
  }, [seed])

  const windStreaks = useMemo(() => {
    const rand = createSeededRandom(seed + 101)
    return Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      top: rand() * 100,
      width: rand() * 300 + 100,
      height: rand() * 1 + 1,
      duration: rand() * 0.3 + 0.15,
      delay: rand() * -1,
      opacity: rand() * 0.4 + 0.1,
    }))
  }, [seed])

  return (
    <main
      className="relative w-full h-screen overflow-hidden font-sans text-slate-100 flex flex-col items-center justify-center selection:bg-sky-500/30"
      style={{
        background: `radial-gradient(ellipse at 60% 40%, ${palette.bg2} 0%, ${palette.bg1} 60%, #050508 100%)`,
      }}
    >
      {/* 1. WIND STREAKS */}
      {windStreaks.map((streak) => (
        <motion.div
          key={`wind-${streak.id}`}
          className="absolute bg-white rounded-full pointer-events-none"
          style={{
            top: `${streak.top}vh`,
            width: `${streak.width}px`,
            height: `${streak.height}px`,
            opacity: streak.opacity,
            right: '-50vw',
          }}
          animate={{ x: '-150vw' }}
          transition={{
            duration: streak.duration,
            delay: streak.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* 2. FAST SNOWFLAKES */}
      {snowflakes.map((flake) => (
        <motion.div
          key={`snow-${flake.id}`}
          className="absolute rounded-full pointer-events-none blur-[1px]"
          style={{
            left: `${flake.xStart}vw`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            top: '-10vh',
            // Tint some flakes with the theme colour for a magical effect
            background: flake.id % 4 === 0 ? hexAlpha(themeColor, 0.7) : 'white',
          }}
          animate={{
            y: '110vh',
            x: -150, // Diagonal blowing effect
          }}
          transition={{
            duration: flake.duration,
            delay: flake.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* SNOWY GROUND */}
      <div className="absolute bottom-0 w-[150%] h-[20vh] bg-slate-100 rounded-t-[100%] shadow-[0_-20px_50px_rgba(255,255,255,0.1)] -translate-x-[15%]" />

      {/* MAIN CONTENT CONTAINER */}
      <div className="relative z-10 flex flex-col items-center max-w-2xl px-6 text-center mt-10">

        {/* CHARACTER & SIGN ROW */}
        <div className="flex items-end justify-center gap-8 mb-12">

          {/* 404 SIGN (Shaking violently) */}
          <motion.div
            className="relative flex flex-col items-center origin-bottom"
            animate={{ rotate: [-4, 5, -5, 4, -3] }}
            transition={{ repeat: Infinity, duration: 0.15, ease: 'linear' }}
          >
            {/* Wooden Board */}
            <div className="relative z-10 bg-amber-700 border-4 border-amber-950 rounded-lg p-6 shadow-2xl transform -rotate-6">
              {/* Snow accumulation on top of sign */}
              <div className="absolute -top-3 -left-2 -right-2 h-6 bg-white rounded-full opacity-95 blur-[1px]" />
              <div className="absolute -top-4 right-4 w-8 h-8 bg-white rounded-full opacity-95 blur-[1px]" />

              <h1
                className="text-7xl md:text-8xl font-black text-amber-100 tracking-tighter"
                style={{
                  textShadow: `4px 4px 0px ${palette.signShadow}, 0 0 20px ${hexAlpha(themeColor, 0.6)}`,
                }}
              >
                404
              </h1>
            </div>
            {/* Wooden Post */}
            <div className="w-6 h-32 bg-amber-900 border-x-2 border-amber-950 -mt-2 rounded-b-sm" />
            {/* Snow pile at base */}
            <div className="absolute bottom-0 w-24 h-8 bg-slate-100 rounded-full blur-[2px]" />
          </motion.div>

          {/* SHIVERING BIRD CHARACTER */}
          <motion.div
            className="relative w-32 h-32 md:w-40 md:h-40"
            // High-frequency x-axis shake
            animate={{ x: [-3, 3, -2, 2, -3] }}
            transition={{ repeat: Infinity, duration: 0.08, ease: 'linear' }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl overflow-visible">
              {/* Scarf blowing in the wind */}
              <motion.path
                d="M 60 65 Q 90 60 110 70 Q 90 75 60 75 Z"
                fill="#ef4444"
                animate={{ d: [
                  "M 60 65 Q 90 60 110 70 Q 90 75 60 75 Z",
                  "M 60 65 Q 80 50 100 65 Q 85 80 60 75 Z",
                  "M 60 65 Q 95 65 115 60 Q 95 80 60 75 Z"
                ] }}
                transition={{ repeat: Infinity, duration: 0.2 }}
              />

              {/* Body – theme-colored */}
              <ellipse cx="50" cy="60" rx="30" ry="35" fill={palette.bodyPrimary} />
              <ellipse cx="45" cy="65" rx="20" ry="25" fill={palette.bodyLight} />

              {/* Scarf Wrap */}
              <path d="M 25 55 Q 50 65 75 55 L 70 70 Q 50 75 30 70 Z" fill="#dc2626" />

              {/* Eyes (Wide & Scared) */}
              <circle cx="35" cy="40" r="10" fill="white" />
              <circle cx="60" cy="40" r="10" fill="white" />
              {/* Pupils shaking slightly */}
              <motion.circle cx="32" cy="40" r="3" fill="black" animate={{ x: [0, 2, 0] }} transition={{ repeat: Infinity, duration: 0.1 }} />
              <motion.circle cx="57" cy="40" r="3" fill="black" animate={{ x: [0, 2, 0] }} transition={{ repeat: Infinity, duration: 0.1 }} />

              {/* Chattering Beak */}
              <motion.path d="M 40 50 L 55 50 L 47 56 Z" fill="#f59e0b" animate={{ y: [-1, 1, -1] }} transition={{ repeat: Infinity, duration: 0.05 }} />
              <motion.path d="M 42 52 L 53 52 L 47 58 Z" fill="#d97706" animate={{ y: [1, -1, 1] }} transition={{ repeat: Infinity, duration: 0.05 }} />

              {/* Huddled Wings – use dark body colour for depth */}
              <path d="M 20 55 Q 10 70 25 80" stroke={palette.bodyDark} strokeWidth="4" fill="none" strokeLinecap="round"/>
              <path d="M 75 55 Q 85 70 70 80" stroke={palette.bodyDark} strokeWidth="4" fill="none" strokeLinecap="round"/>

              {/* Snow on head */}
              <path d="M 30 25 Q 50 15 70 25 Q 75 30 65 32 Q 50 28 35 32 Q 25 30 30 25" fill="white" />
            </svg>
            <div className="absolute -bottom-2 left-4 w-24 h-6 bg-slate-100 rounded-full blur-[2px]" />
          </motion.div>
        </div>

        {/* COPY / TEXT */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            Waduh! Halaman Hilang!
          </h2>
          <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-md mx-auto font-medium drop-shadow-md">
            Sepertinya halaman ini terjebak dalam badai salju dan tidak bisa ditemukan.
          </p>

          {/* CTA BUTTON – theme-coloured glow & accents */}
          <Link
            href="/admin"
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 font-bold text-slate-900 rounded-full overflow-hidden transition-all active:scale-95"
            style={{
              backgroundColor: palette.buttonBg,
              boxShadow: `0 0 40px ${palette.glow}`,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.backgroundColor = palette.buttonHover
              el.style.boxShadow = `0 0 60px ${palette.glowHover}`
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.backgroundColor = palette.buttonBg
              el.style.boxShadow = `0 0 40px ${palette.glow}`
            }}
          >
            {/* Button Shine Effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1s_infinite]" />

            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Cari Jalan Pulang (Dashboard)
          </Link>
        </motion.div>

      </div>

      {/* Tailwind Custom Animation for Button Shine */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </main>
  )
}
