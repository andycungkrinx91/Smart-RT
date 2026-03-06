'use client'

import { useState, useId, useCallback } from 'react'
import { Eye, EyeOff, Lock, ShieldCheck, ShieldAlert, Shield, CheckCircle2, Circle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type StrengthLevel = 'empty' | 'weak' | 'medium' | 'strong'

interface StrengthResult {
  level: StrengthLevel
  score: number      // 0–5
  label: string
  filledSegments: number // 1 | 2 | 3
}

// ─── Validation Logic ─────────────────────────────────────────────────────────

/**
 * Scores a password on five independent criteria (0–5):
 *   1. length ≥ 8
 *   2. length ≥ 12
 *   3. contains uppercase + lowercase
 *   4. contains digits
 *   5. contains special characters
 *
 * Strong  → score 4–5  (3 segments, brand-blue bar)
 * Medium  → score 2–3  (2 segments, amber bar)
 * Weak    → score 0–1  (1 segment,  red bar)
 * Empty   → score 0    (no bar)
 */
function evaluateStrength(password: string): StrengthResult {
  if (!password) {
    return { level: 'empty', score: 0, label: '', filledSegments: 0 }
  }

  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password))   score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) {
    return { level: 'weak',   score, label: 'Weak',   filledSegments: 1 }
  }
  if (score <= 3) {
    return { level: 'medium', score, label: 'Medium', filledSegments: 2 }
  }
  return   { level: 'strong', score, label: 'Strong', filledSegments: 3 }
}

function passwordsMatch(a: string, b: string): boolean {
  return a.length > 0 && b.length > 0 && a === b
}

function passwordsMismatch(a: string, b: string): boolean {
  return b.length > 0 && a !== b
}

// ─── Strength Bar ─────────────────────────────────────────────────────────────

/**
 * Three-segment bar that uses CSS variables to stay in sync with the design token:
 *   Weak   → red
 *   Medium → amber
 *   Strong → var(--color-brand)   ← the requirement
 */
function StrengthBar({ strength }: { strength: StrengthResult }) {
  const segmentStyle = (idx: number): React.CSSProperties => {
    const filled = idx < strength.filledSegments

    if (!filled) return {}

    if (strength.level === 'strong') {
      return { backgroundColor: 'var(--color-brand)' }
    }
    return {}
  }

  const segmentClass = (idx: number): string => {
    const filled = idx < strength.filledSegments
    const base   = 'h-1.5 flex-1 rounded-full transition-all duration-500'

    if (!filled) return `${base} bg-border`

    if (strength.level === 'weak')   return `${base} bg-red-500`
    if (strength.level === 'medium') return `${base} bg-amber-400`
    // 'strong' → inline style handles colour
    return `${base}`
  }

  if (strength.level === 'empty') {
    return (
      <div className="flex gap-1.5" role="presentation" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full bg-border/70" />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex gap-1.5"
      role="meter"
      aria-valuenow={strength.filledSegments}
      aria-valuemin={0}
      aria-valuemax={3}
      aria-label={`Password strength: ${strength.label}`}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={segmentClass(i)}
          style={segmentStyle(i)}
        />
      ))}
    </div>
  )
}

// ─── Strength Badge ───────────────────────────────────────────────────────────

function StrengthBadge({ strength }: { strength: StrengthResult }) {
  if (strength.level === 'empty') return null

  const config = {
    weak:   { Icon: ShieldAlert,  cls: 'text-red-500',   bg: 'bg-red-50   border-red-200'   },
    medium: { Icon: Shield,       cls: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
    strong: { Icon: ShieldCheck,  cls: '',                bg: 'border'                       },
  }[strength.level]

  const strongStyle: React.CSSProperties =
    strength.level === 'strong'
      ? { color: 'var(--color-brand)', backgroundColor: 'var(--color-brand-light)', borderColor: 'color-mix(in srgb, var(--color-brand) 30%, transparent)' }
      : {}

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${config.bg} ${config.cls}`}
      style={strongStyle}
    >
      <config.Icon className="h-3 w-3" aria-hidden />
      {strength.label}
    </span>
  )
}

// ─── Criteria Checklist ───────────────────────────────────────────────────────

interface CriteriaItemProps {
  met: boolean
  label: string
}

function CriteriaItem({ met, label }: CriteriaItemProps) {
  return (
    <li
      className={[
        'flex items-center gap-2 text-[11px] transition-colors duration-200',
        met ? 'text-emerald-600' : 'text-slate-400',
      ].join(' ')}
    >
      {met
        ? <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden />
        : <Circle       className="h-3 w-3 shrink-0"                  aria-hidden />
      }
      {label}
    </li>
  )
}

// ─── Password Field ───────────────────────────────────────────────────────────

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
  onBlur?: () => void
  hasError?: boolean
  hasSuccess?: boolean
  errorMessage?: string
  hint?: React.ReactNode
  autoFocus?: boolean
}

function PasswordField({
  id,
  label,
  value,
  placeholder,
  onChange,
  onBlur,
  hasError,
  hasSuccess,
  errorMessage,
  hint,
  autoFocus,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  // Ring / border states
  const wrapperRing = hasError
    ? 'border-red-400 ring-2 ring-red-100'
    : hasSuccess
    ? 'border-emerald-400 ring-2 ring-emerald-100'
    : 'border-border hover:border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--color-brand)_18%,transparent)]'

  return (
    <div className="space-y-1.5">
      {/* Label */}
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500"
      >
        {label}
      </label>

      {/* Input wrapper — border lives on the wrapper for clean ring layout */}
      <div
        className={[
          'relative flex items-center rounded-corporate border bg-background',
          'transition-all duration-200',
          wrapperRing,
        ].join(' ')}
      >
        {/* Prefix icon */}
        <Lock
          className="pointer-events-none ml-3 h-4 w-4 shrink-0 text-slate-400"
          aria-hidden
        />

        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="new-password"
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="min-w-0 flex-1 bg-transparent py-2.5 pl-2.5 pr-2 text-sm text-slate-700 placeholder-slate-400 outline-none"
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={`${id}-hint`}
        />

        {/* Visibility toggle */}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          className="mr-3 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible
            ? <EyeOff className="h-4 w-4" aria-hidden />
            : <Eye    className="h-4 w-4" aria-hidden />
          }
        </button>
      </div>

      {/* Hint / error slot */}
      <div id={`${id}-hint`} aria-live="polite" className="space-y-1">
        {hint}
        {hasError && errorMessage && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <span aria-hidden className="text-[10px]">✕</span>
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
      />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface UpdatePasswordFormProps {
  /** Called with the new password on successful submission */
  onSubmit: (newPassword: string) => Promise<void>
  /** External error message from the parent (e.g. API error) */
  externalError?: string
  /** External success message from the parent */
  externalSuccess?: string
}

export function UpdatePasswordForm({
  onSubmit,
  externalError,
  externalSuccess,
}: UpdatePasswordFormProps) {
  const baseId    = useId()
  const newId     = `${baseId}-new`
  const confirmId = `${baseId}-confirm`

  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving,        setIsSaving]        = useState(false)
  const [touched,         setTouched]         = useState({ new: false, confirm: false })

  const strength   = evaluateStrength(newPassword)
  const isMatch    = passwordsMatch(newPassword, confirmPassword)
  const isMismatch = passwordsMismatch(newPassword, confirmPassword)

  // Errors surface only after the field has been interacted with
  const showWeakError     = touched.new     && newPassword.length > 0 && newPassword.length < 8
  const showMismatchError = touched.confirm && isMismatch

  const isFormValid =
    newPassword.length >= 8 &&
    strength.level !== 'weak' &&
    isMatch

  const handleNew = useCallback((val: string) => {
    setNewPassword(val)
    setTouched((t) => ({ ...t, new: true }))
  }, [])

  const handleConfirm = useCallback((val: string) => {
    setConfirmPassword(val)
    setTouched((t) => ({ ...t, confirm: true }))
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTouched({ new: true, confirm: true })
    if (!isFormValid) return

    setIsSaving(true)
    try {
      await onSubmit(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setTouched({ new: false, confirm: false })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex justify-center">
      <div
        className="card w-full max-w-md"
        style={{ animation: 'upf-slideIn 0.35s cubic-bezier(0.16,1,0.3,1) both' }}
      >

        {/* ── Card Header ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          {/* Brand accent pill */}
          <span
            className="block h-8 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: 'var(--color-brand)' }}
            aria-hidden
          />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">Update Password</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              Use uppercase, numbers, and symbols for a strong password.
            </p>
          </div>
        </div>

        {/* ── Card Body ────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-6 px-6 py-6">

            {/* External feedback banners */}
            {externalError && (
              <div
                role="alert"
                className="rounded-corporate border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                style={{ animation: 'upf-fadeIn 0.2s ease both' }}
              >
                {externalError}
              </div>
            )}
            {externalSuccess && (
              <div
                role="status"
                className="rounded-corporate border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                style={{ animation: 'upf-fadeIn 0.2s ease both' }}
              >
                {externalSuccess}
              </div>
            )}

            {/* ── New Password ─────────────────────────── */}
            <PasswordField
              id={newId}
              label="New Password"
              value={newPassword}
              placeholder="Min. 8 characters"
              onChange={handleNew}
              autoFocus
              hasError={showWeakError}
              hasSuccess={touched.new && newPassword.length >= 8}
              errorMessage="Password must be at least 8 characters."
              hint={
                newPassword.length > 0 ? (
                  <div
                    className="mt-2.5 space-y-2.5 rounded-corporate border border-border/80 bg-background p-3"
                    style={{ animation: 'upf-fadeIn 0.2s ease both' }}
                  >
                    {/* Segmented bar + badge on same row */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <StrengthBar strength={strength} />
                      </div>
                      <StrengthBadge strength={strength} />
                    </div>

                    {/* Criteria checklist */}
                    <ul className="grid grid-cols-2 gap-x-2 gap-y-1" aria-label="Password criteria">
                      <CriteriaItem met={newPassword.length >= 8}  label="8+ characters" />
                      <CriteriaItem met={newPassword.length >= 12} label="12+ characters" />
                      <CriteriaItem
                        met={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)}
                        label="Upper & lowercase"
                      />
                      <CriteriaItem met={/\d/.test(newPassword)}            label="Contains number" />
                      <CriteriaItem met={/[^A-Za-z0-9]/.test(newPassword)} label="Special character" />
                    </ul>
                  </div>
                ) : null
              }
            />

            {/* ── Confirm Password ─────────────────────── */}
            <PasswordField
              id={confirmId}
              label="Confirm Password"
              value={confirmPassword}
              placeholder="Repeat new password"
              onChange={handleConfirm}
              hasError={showMismatchError}
              hasSuccess={isMatch && touched.confirm}
              errorMessage="Passwords do not match."
            />

            {/* Match success note */}
            {isMatch && touched.confirm && (
              <p
                className="flex items-center gap-1.5 text-xs text-emerald-600"
                style={{ animation: 'upf-fadeIn 0.2s ease both' }}
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Passwords match.
              </p>
            )}
          </div>

          {/* ── Card Footer ──────────────────────────────────────────────── */}
          <div className="border-t border-border bg-border/10 px-6 py-4">
            <button
              type="submit"
              disabled={isSaving || !isFormValid}
              className={[
                'btn-primary w-full gap-2',
                !isFormValid && !isSaving ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
            >
              {isSaving ? (
                <>
                  <SpinnerIcon />
                  Saving…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" aria-hidden />
                  Save Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Scoped keyframes — injected once per mount */}
      <style>{`
        @keyframes upf-slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes upf-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
