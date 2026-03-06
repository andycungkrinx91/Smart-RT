'use client'

/**
 * Toast.tsx — Beautiful animated alert system
 *
 * Usage:
 *   const { toasts, showToast, dismissToast } = useToast()
 *   <ToastContainer toasts={toasts} onDismiss={dismissToast} />
 *
 *   showToast('success', 'Data berhasil disimpan.')
 *   showToast('error',   'Terjadi kesalahan.')
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error'

export interface Toast {
  id: string
  type: ToastType
  message: string
  /** Auto-dismiss duration in ms. Default 4000. Pass 0 to keep indefinitely. */
  duration?: number
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev, { id, type, message, duration }])
      return id
    },
    [],
  )

  return { toasts, showToast, dismissToast }
}

// ─── Single toast item ────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

const PROGRESS_DURATION_DEFAULT = 4000

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const duration = toast.duration ?? PROGRESS_DURATION_DEFAULT
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (duration <= 0) return
    timerRef.current = setTimeout(() => onDismiss(toast.id), duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.id, duration, onDismiss])

  const isSuccess = toast.type === 'success'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 110, scale: 0.92 }}
      animate={{ opacity: 1, x: 0,   scale: 1    }}
      exit={{    opacity: 0, x: 110, scale: 0.9  }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      role="alert"
      aria-live="polite"
      className={[
        'relative flex w-full max-w-sm items-start gap-3 overflow-hidden',
        'rounded-xl border px-4 py-3.5 shadow-lg backdrop-blur-sm',
        isSuccess
          ? 'border-emerald-200/60 bg-white/95 text-emerald-800 shadow-emerald-100'
          : 'border-red-200/60    bg-white/95 text-red-800    shadow-red-100',
      ].join(' ')}
    >
      {/* Icon */}
      <span className={[
        'mt-0.5 shrink-0',
        isSuccess ? 'text-emerald-500' : 'text-red-500',
      ].join(' ')}>
        {isSuccess
          ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          : <XCircle      className="h-5 w-5" aria-hidden="true" />
        }
      </span>

      {/* Message */}
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className={[
          'mt-0.5 shrink-0 rounded-md p-0.5 transition-colors',
          isSuccess
            ? 'text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600'
            : 'text-red-400    hover:bg-red-50    hover:text-red-600',
        ].join(' ')}
        aria-label="Tutup notifikasi"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Progress bar — shrinks over `duration` ms */}
      {duration > 0 && (
        <span
          className={[
            'absolute bottom-0 left-0 h-[3px] rounded-b-xl',
            isSuccess ? 'bg-emerald-400' : 'bg-red-400',
          ].join(' ')}
          style={{
            animation: `shrink-width ${duration}ms linear forwards`,
          }}
          aria-hidden="true"
        />
      )}
    </motion.div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 top-20 z-[9999] flex flex-col items-end gap-2.5 sm:right-6"
    >
      <AnimatePresence mode="sync">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm">
            <ToastItem toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
