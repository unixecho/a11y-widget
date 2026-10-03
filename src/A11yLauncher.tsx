'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import A11yPortal from './internal/Portal'
import { useA11y } from './A11yProvider'
import { usePrefersReducedMotion } from './internal/motion'
import { a11yT } from './i18n'
import { A11Y_SHORTCUT_KEY, type A11yCorner } from './types'
import type { IntroKind } from './lifecycle'

// The trigger button. Portalled to <body>: any ancestor with an active
// `transform` (a common page-entrance-animation pattern) would silently
// become this button's containing block, resolving `position: fixed`
// against the page instead of the viewport.
//
// `corner` is a physical value, never logical start/end — fixed chrome
// stays in the same physical corner regardless of text direction.
//
// `phase` / `intro` / `autoFocus` are optional and drive the entrance, outro
// and focus hand-off (see lifecycle.ts). Omit them and this is the plain,
// static button it always was — a host composing the pieces by hand keeps
// working unchanged.

const CORNER_CLASS: Record<A11yCorner, string> = {
  'top-left': 'a11y-fab-tl',
  'top-right': 'a11y-fab-tr',
  'bottom-left': 'a11y-fab-bl',
  'bottom-right': 'a11y-fab-br',
}

export interface A11yLauncherProps {
  corner: A11yCorner
  open: boolean
  onOpen: () => void
  /** `leaving` plays the outro and makes the button inert. Default `visible`. */
  phase?: 'entering' | 'visible' | 'leaving'
  /** `full` = pop + pulse + label pill (first visit); `quick` = pop only
   *  (every later load, and a restore). Omit for no entrance at all. */
  intro?: IntroKind
  /** Take focus on mount — used when the visitor restores the button from the
   *  toast, so keyboard focus lands on the thing they just brought back. */
  autoFocus?: boolean
}

export default function A11yLauncher(props: A11yLauncherProps) {
  // The hooks live in the inner component so they run when the BUTTON mounts —
  // A11yPortal renders nothing for its first tick, and effects in this outer
  // component would run before there is anything to measure or focus.
  return (
    <A11yPortal>
      <LauncherButton {...props} />
    </A11yPortal>
  )
}

/** Where the button's box was last seen settled, and which corner it was in. */
interface Settled { corner: A11yCorner; left: number; top: number; width: number }

function settledBox(el: HTMLElement, corner: A11yCorner): Settled {
  const r = el.getBoundingClientRect()
  return { corner, left: r.left, top: r.top, width: r.width }
}

function LauncherButton({ corner, open, onOpen, phase = 'visible', intro, autoFocus = false }: A11yLauncherProps) {
  const { lang, dir, prefs } = useA11y()
  const skipMotion = usePrefersReducedMotion() || prefs.pauseAnimations
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const settled = useRef<Settled | null>(null)

  const setRef = useCallback((el: HTMLButtonElement | null) => {
    btnRef.current = el
    // Deferred out of the commit that attaches the ref. A timeout rather than
    // requestAnimationFrame: rAF never fires in a page that is not painting,
    // and moving focus must not depend on that. preventScroll because this is
    // a position:fixed element — there is nothing to scroll to.
    if (el && autoFocus) window.setTimeout(() => el.focus({ preventScroll: true }), 0)
  }, [autoFocus])

  // When the visitor picks another corner the button GLIDES there rather than
  // teleporting — FLIP: the new corner class has already moved it, so measure
  // where it is now, compare with where it just was, and animate from the old
  // spot back to none. Only measured while `visible`: mid-entrance the rect
  // includes the pop's scale and would give a wrong delta. No deps on purpose —
  // it is cheap, and it has to see every render to keep `settled` current.
  //
  // The delta is between the SAME point of the box (its top-left) before and
  // after. The two corners' own nearest points are different points of the
  // box, and measuring those would start the glide a button-width off. And if
  // the width changed (the first-visit label is mid-open) there is no honest
  // "same box" to glide, so it snaps instead.
  useLayoutEffect(() => {
    const el = btnRef.current
    if (!el) return
    const prev = settled.current
    const now = phase === 'visible' ? settledBox(el, corner) : null
    settled.current = now
    if (!prev || !now || prev.corner === corner || skipMotion) return
    if (Math.abs(prev.width - now.width) > 1) return
    const dx = prev.left - now.left
    const dy = prev.top - now.top
    if ((!dx && !dy) || typeof el.animate !== 'function') return
    el.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
      // The house travel curve (--ease), never the spring: a spring overshoots
      // past its destination, and here the destination is the edge of the screen.
      { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    )
  })

  // A resize moves a bottom/right-pinned button without re-rendering us, which
  // would leave `settled` pointing at a stale spot for the next glide.
  useEffect(() => {
    const onResize = () => {
      const el = btnRef.current
      if (el && settled.current) settled.current = settledBox(el, settled.current.corner)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const leaving = phase === 'leaving'

  return (
    <button
      ref={setRef}
      type="button"
      className={`a11y-fab ${CORNER_CLASS[corner]} a11yw-press`}
      data-phase={phase}
      data-intro={intro}
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={a11yT('openLabel', lang)}
      // The outro is a visual flourish on a button that is already gone as far
      // as the visitor is concerned: keep it out of the tab order and the
      // accessibility tree for its last 380ms.
      aria-hidden={leaving || undefined}
      tabIndex={leaving ? -1 : undefined}
    >
      {intro === 'full' && (
        // Purely visual and aria-hidden: the button's own aria-label already
        // says what it is, and announcing a label on every first visit would
        // be noise for a screen reader. Its text is a substring of that
        // aria-label in all three languages (WCAG 2.5.3 Label in Name).
        <span className="a11y-fab-label" aria-hidden>
          <span className="a11y-fab-label-clip">
            <span className="a11y-fab-label-inner" dir={dir}>
              {a11yT('launcherLabel', lang)}
              <kbd className="a11yw-kbd">{A11Y_SHORTCUT_KEY}</kbd>
            </span>
          </span>
        </span>
      )}
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor"
        strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v1M9 12h6M12 12v5" />
      </svg>
    </button>
  )
}
