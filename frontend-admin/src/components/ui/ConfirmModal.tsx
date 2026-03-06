'use client'

/**
 * ConfirmModal.tsx — Reusable animated deletion-confirmation dialog
 *
 * Usage:
 *   <ConfirmModal
 *     open={showConfirm}
 *     title="Hapus Data"
 *     description="Apakah kamu mau menghapus data ini?"
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowConfirm(false)}
 *     isLoading={isDeleting}
 *   />
 */

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { AlertTriangle, Trash2 } from 'lucide-react'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ConfirmModalProps {
  /** Controls visibility */
  open: boolean
  /** Modal heading. Defaults to "Hapus Data" */
  title?: string
  /** Body text. Defaults to "Apakah kamu mau menghapus data ini?" */
  description?: string
  /** Label for the confirm button. Defaults to "Ya, Hapus" */
  confirmLabel?: string
  /** Label for the cancel button. Defaults to "Tidak" */
  cancelLabel?: string
  /** Show a spinner / disable buttons while the async action runs */
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// ─── Animation variants ───────────────────────────────────────────────────────

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
  exit:   { opacity: 0, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
}

const panelVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.88, y: 16 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', stiffness: 340, damping: 26, delay: 0.04 },
  },
  exit: {
    opacity: 0, scale: 0.92, y: 10,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfirmModal({
  open,
  title       = 'Hapus Data',
  description = 'Apakah kamu mau menghapus data ini?',
  confirmLabel = 'Ya, Hapus',
  cancelLabel  = 'Tidak',
  isLoading    = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Focus trap — move focus into the dialog when it opens
  const cancelBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      // Short delay so the animation has started before we steal focus
      const t = setTimeout(() => cancelBtnRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isLoading, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="confirm-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]"
            aria-hidden="true"
            onClick={() => { if (!isLoading) onCancel() }}
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-desc"
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              key="confirm-panel"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={[
                'pointer-events-auto w-full max-w-sm',
                'rounded-2xl border border-border/80 bg-surface',
                'shadow-[0_20px_60px_rgba(4,9,20,0.12)]',
                'overflow-hidden',
              ].join(' ')}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-red-400 via-rose-500 to-red-600" />

              <div className="px-6 py-6">
                {/* Icon + Title */}
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2
                    id="confirm-modal-title"
                    className="text-base font-semibold text-slate-900"
                  >
                    {title}
                  </h2>
                </div>

                {/* Description */}
                <p
                  id="confirm-modal-desc"
                  className="mt-3 text-sm leading-relaxed text-slate-600"
                >
                  {description}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Tindakan ini tidak dapat dibatalkan.
                </p>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-end gap-2">
                  {/* Tidak / Cancel */}
                  <button
                    ref={cancelBtnRef}
                    type="button"
                    disabled={isLoading}
                    onClick={onCancel}
                    className={[
                      'inline-flex items-center justify-center rounded-lg',
                      'border border-border px-4 py-2 text-sm font-medium text-slate-600',
                      'transition-colors hover:border-slate-300 hover:bg-slate-50',
                      'focus:outline-none focus:ring-2 focus:ring-primary-focus',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                    ].join(' ')}
                  >
                    {cancelLabel}
                  </button>

                  {/* Ya, Hapus / Confirm */}
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={onConfirm}
                    className={[
                      'inline-flex items-center justify-center gap-1.5 rounded-lg',
                      'bg-red-500 px-4 py-2 text-sm font-medium text-white',
                      'transition-all hover:bg-red-600 hover:shadow-md active:scale-[0.97]',
                      'focus:outline-none focus:ring-2 focus:ring-red-300',
                      'disabled:cursor-not-allowed disabled:opacity-60',
                    ].join(' ')}
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        Menghapus...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        {confirmLabel}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
