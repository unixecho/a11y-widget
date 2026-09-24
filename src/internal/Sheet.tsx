'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import A11yPortal from './Portal'

// A self-contained bottom sheet — this package's own dialog shell, never a
// host app's. Depending on a host's existing sheet/modal component would
// make this package quietly stop being portable the moment that host
// renamed or restructured its own component; this one carries its own
// scrim, panel, focus trap and escape handling so it drops into ANY React
// app unmodified.
//
//   • A REAL FOCUS TRAP, not just a scrim. Tab wraps at both ends; a
//     keyboard/screen-reader user can never tab out into page content that
//     is still there, still focusable, and visually obscured (WCAG 2.4.3).
//   • Focus RESTORED to whatever opened the sheet when it closes.
//   • Escape closes. Clicking the scrim closes; clicking the panel does not.
//   • Scroll lock via `overflow: hidden` on <body> — not the
//     `position: fixed` variant, which scrolls iOS back to the top of the
//     page on release.

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function A11ySheet({
  open, onClose, label, children, footer, dir,
}: {
  open: boolean
  onClose: () => void
  /** Accessible name for the dialog. */
  label: string
  children: ReactNode
  /** Rendered outside the scrolling area, pinned to the bottom of the panel. */
  footer?: ReactNode
  dir: 'rtl' | 'ltr'
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  const focusables = useCallback((): HTMLElement[] => {
    const panel = panelRef.current
    if (!panel) return []
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((el) => el.offsetParent !== null || el === document.activeElement)
  }, [])

  useEffect(() => {
    if (!open) return

    returnFocusTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // One frame's delay: the panel is mid-animation on first paint, and
    // focusing it immediately makes iOS scroll the sheet before it lands.
    const t = window.setTimeout(() => {
      const list = focusables()
      ;(list[0] ?? panelRef.current)?.focus()
    }, 60)

    return () => {
      document.body.style.overflow = prevOverflow
      window.clearTimeout(t)
      const active = document.activeElement
      if (!active || active === document.body || panelRef.current?.contains(active)) {
        returnFocusTo.current?.focus?.()
      }
    }
  }, [open, focusables])

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
      if (e.key !== 'Tab') return
      const list = focusables()
      if (!list.length) return
      // Non-null: the length check above guarantees both indices exist —
      // a strict consumer tsconfig (noUncheckedIndexedAccess) just can't
      // see that guard statically.
      const first = list[0]!
      const last = list[list.length - 1]!
      const active = document.activeElement as HTMLElement | null
      const inside = !!panelRef.current?.contains(active)
      if (e.shiftKey) {
        if (active === first || !inside) { e.preventDefault(); last.focus() }
      } else if (active === last || !inside) {
        e.preventDefault(); first.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, onClose, focusables])

  if (!open) return null

  return (
    <A11yPortal>
      <div className="a11yw-scrim" onClick={onClose} dir={dir}>
        <div
          ref={panelRef}
          className="a11yw-panel"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="a11yw-grabber" aria-hidden />
          {children}
          {footer}
        </div>
      </div>
    </A11yPortal>
  )
}
