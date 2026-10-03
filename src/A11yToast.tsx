'use client'

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import A11yPortal from './internal/Portal'
import { withKey } from './internal/KeyHint'
import { usePrefersReducedMotion } from './internal/motion'
import { useA11y } from './A11yProvider'
import { a11yT } from './i18n'
import { TOAST_LEAVE_MS, TOAST_VISIBLE_MS, type ToastPhase } from './lifecycle'
import type { A11yCorner } from './types'

// The notification shown after the launcher is hidden: what happened, and the
// two ways back (the key, or just refreshing the page), plus a button for
// anyone with no keyboard.
//
// It appears in the SAME physical corner the launcher just left, so the
// visitor's eye is already there — the outro and this are one gesture.
//
// Timing, all of it deliberate:
//   • It auto-dismisses after TOAST_VISIBLE_MS, but hovering it or focusing
//     anything in it PAUSES the clock (WCAG 2.2.1 Timing Adjustable) — a toast
//     that holds focus never times out from under a keyboard user.
//   • The timers are JS, never `animationend`: the visitor may have switched
//     on "Pause animations", which sets every animation to ~0ms, and a toast
//     that dismissed itself the instant its progress bar "finished" would
//     vanish before it could be read. The bar is decoration; the clock is JS.

const REGION_CLASS: Record<A11yCorner, string> = {
  'top-left': 'a11yw-toast-tl',
  'top-right': 'a11yw-toast-tr',
  'bottom-left': 'a11yw-toast-bl',
  'bottom-right': 'a11yw-toast-br',
}

export interface A11yToastProps {
  phase: ToastPhase
  /** The launcher's corner — the toast sits in the same one. */
  corner: A11yCorner
  /** "Bring it back". */
  onRestore: () => void
  /** Close button, Escape, or the timer running out. */
  onDismiss: () => void
  /** The exit animation has finished and the toast can be unmounted. */
  onGone: () => void
  /** Move focus to the restore button when the toast appears. Used when the
   *  hide was triggered from inside the panel: the panel and launcher that
   *  held the visitor's focus are gone, and dropping them onto <body> would
   *  lose their place. */
  autoFocus?: boolean
}

export default function A11yToast(props: A11yToastProps) {
  const { dir } = useA11y()
  return (
    <A11yPortal>
      {/* The region is the live region and is ALWAYS mounted, empty until a
          toast exists. A live region inserted already containing its text is
          announced unreliably by screen readers; one that exists first and
          then receives content is announced everywhere. */}
      <div className={`a11yw-toast-region ${REGION_CLASS[props.corner]}`} aria-live="polite" dir={dir}>
        {props.phase !== 'none' && <Toast {...props} />}
      </div>
    </A11yPortal>
  )
}

function Toast({ phase, onRestore, onDismiss, onGone, autoFocus = false }: A11yToastProps) {
  const { lang, prefs } = useA11y()
  const skipMotion = usePrefersReducedMotion() || prefs.pauseAnimations
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const paused = hovered || focused

  // The callbacks are read through refs so a parent passing fresh inline
  // functions every render cannot restart the clock.
  const dismissRef = useRef(onDismiss)
  const goneRef = useRef(onGone)
  useEffect(() => { dismissRef.current = onDismiss; goneRef.current = onGone })

  // Time left on the clock. Pausing stores what is left; resuming spends it.
  const remaining = useRef(TOAST_VISIBLE_MS)
  useEffect(() => {
    // A toast that re-enters (hidden again while the last one was still
    // leaving) gets a full clock, not whatever the previous one had left.
    if (phase === 'in') remaining.current = TOAST_VISIBLE_MS
  }, [phase])

  useEffect(() => {
    if (phase !== 'in' || paused) return
    const startedAt = performance.now()
    const id = window.setTimeout(() => dismissRef.current(), remaining.current)
    return () => {
      window.clearTimeout(id)
      remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt))
    }
  }, [phase, paused])

  useEffect(() => {
    if (phase !== 'out') return
    const id = window.setTimeout(() => goneRef.current(), skipMotion ? 0 : TOAST_LEAVE_MS)
    return () => window.clearTimeout(id)
  }, [phase, skipMotion])

  const restoreRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (phase !== 'in' || !autoFocus) return
    // Deferred past this commit's other effects so nothing else can move focus
    // after us (the sheet is told not to restore focus on the hide path, but
    // this keeps the ordering from mattering). A timeout, not
    // requestAnimationFrame: rAF never fires in a page that is not painting,
    // and moving focus must not depend on that.
    const id = window.setTimeout(() => restoreRef.current?.focus({ preventScroll: true }), 0)
    return () => window.clearTimeout(id)
  }, [phase, autoFocus])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    onDismiss()
  }

  return (
    <div
      className="a11yw-toast"
      data-state={phase}
      data-paused={paused || undefined}
      style={{ '--a11yw-toast-ms': `${TOAST_VISIBLE_MS}ms` } as CSSProperties}
      onKeyDown={onKeyDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        // Focus moving between the toast's own buttons is not leaving it.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
    >
      <div className="a11yw-toast-head">
        <span className="a11yw-toast-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor"
            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v1M9 12h6M12 12v5" />
          </svg>
        </span>
        <div className="a11yw-toast-text">
          <p className="a11yw-toast-title">{a11yT('toastTitle', lang)}</p>
          <p className="a11yw-toast-sub">{a11yT('toastSettings', lang)}</p>
        </div>
        <button
          type="button"
          className="a11yw-toast-close a11yw-press"
          onClick={onDismiss}
          aria-label={a11yT('toastDismiss', lang)}
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor"
            strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* Plain <div>/<p>, not a <ul>: inside a live region a list is announced
          as "list, 2 items" before its content, which is pure noise here. */}
      <div className="a11yw-toast-hints">
        {/* Hidden on touch-only devices (CSS): there is no F2 to press, and
            the button below is the way back. */}
        <p className="a11yw-toast-hint a11yw-toast-keyhint">
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor"
            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
            <path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8" />
          </svg>
          <span>{withKey(a11yT('toastKeyHint', lang))}</span>
        </p>
        <p className="a11yw-toast-hint">
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor"
            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 12a8 8 0 1 1-2.6-5.9" />
            <path d="M20 4v5h-5" />
          </svg>
          <span>{a11yT('toastRefreshHint', lang)}</span>
        </p>
      </div>

      <div className="a11yw-toast-actions">
        <button
          ref={restoreRef}
          type="button"
          className="a11yw-toast-restore a11yw-press"
          onClick={onRestore}
        >
          {a11yT('toastRestore', lang)}
        </button>
      </div>

      <span className="a11yw-toast-timer" aria-hidden />
    </div>
  )
}
