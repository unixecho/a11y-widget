'use client'

import { useEffect, useRef, useState } from 'react'
import A11yPortal from './internal/Portal'
import { useA11y } from './A11yProvider'
import { usePrefersReducedMotion } from './internal/motion'
import { whenPageSettled } from './internal/settle'
import { useElementRect, useLocaleButton, localeSelectors } from './internal/locale'
import { attachGlobeItem } from './internal/globeMenu'
import { hintSide } from './placement'
import { a11yT } from './i18n'
import { REENABLE_HINT_MS, type HintPhase } from './lifecycle'
import type { A11yCorner } from './types'

// Everything that lets a visitor who has switched the widget OFF turn it back on,
// from the host's locale (globe) button:
//
//   1. WHILE OFF, the menu the globe opens gets an "Enable accessibility widget"
//      item (internal/globeMenu.ts).
//   2. ON EVERY LOAD where it is off, a small hint appears beside the globe saying
//      so — once the globe exists and the page has stopped animating, so it never
//      competes with the host's own load-in.
//   3. A screen reader is told when it has come back.
//
// Renders nothing at all while the widget is on.

const GLOBE_GIVE_UP_MS = 10_000

export interface A11yReEnableProps {
  /** The widget is off. */
  active: boolean
  hint: HintPhase
  onHintShow: () => void
  onHintDone: () => void
  /** Turn the widget back on. */
  onEnable: () => void
  /** The launcher's corner — where the fallback hint goes on a page with no globe. */
  corner: A11yCorner
}

export default function A11yReEnable(props: A11yReEnableProps) {
  const { active, hint, onHintShow, onHintDone, onEnable, corner } = props
  const { lang, dir, config } = useA11y()
  const selectors = localeSelectors(config.localeButton)
  const globe = useLocaleButton(selectors, active)
  const globeRef = useRef(globe)
  globeRef.current = globe

  // Stable across renders so a parent passing fresh inline functions cannot
  // tear down and rebuild the menu item (or restart the hint's clock).
  const enableRef = useRef(onEnable)
  const showRef = useRef(onHintShow)
  const doneRef = useRef(onHintDone)
  useEffect(() => { enableRef.current = onEnable; showRef.current = onHintShow; doneRef.current = onHintDone })

  // 1. The menu item.
  const itemLabel = a11yT('enableItem', lang)
  useEffect(() => {
    if (!active || !globe) return
    return attachGlobeItem(globe, { label: itemLabel, onEnable: () => enableRef.current() })
  }, [active, globe, itemLabel])

  // 2a. When to show the hint: the page has settled AND the globe is there. A
  // page that never draws a globe stops being waited for after a while, and the
  // hint falls back to a pill in the launcher's corner (it is then the only
  // visible way back, other than the shortcut key).
  const [giveUp, setGiveUp] = useState(false)
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (hint !== 'pending') { setSettled(false); setGiveUp(false); return }
    const cancel = whenPageSettled(() => setSettled(true))
    const id = window.setTimeout(() => setGiveUp(true), GLOBE_GIVE_UP_MS)
    return () => { cancel(); window.clearTimeout(id) }
  }, [hint])
  useEffect(() => {
    if (hint === 'pending' && settled && (globe || giveUp)) showRef.current()
  }, [hint, settled, globe, giveUp])

  // 2b. How long it stays, and the things that end it sooner: any tap, click or
  // key — the visitor is already doing something, and the hint has done its job.
  useEffect(() => {
    if (hint !== 'shown') return
    const end = () => doneRef.current()
    const id = window.setTimeout(end, REENABLE_HINT_MS)
    // A short grace so the very press that triggered a load does not end it.
    const armed = window.setTimeout(() => {
      document.addEventListener('pointerdown', end, true)
      document.addEventListener('keydown', end, true)
    }, 400)
    return () => {
      window.clearTimeout(id)
      window.clearTimeout(armed)
      document.removeEventListener('pointerdown', end, true)
      document.removeEventListener('keydown', end, true)
    }
  }, [hint])

  // 3. The announcement, when the widget goes from off to on.
  const [announcement, setAnnouncement] = useState('')
  const wasActive = useRef(active)
  useEffect(() => {
    if (wasActive.current && !active) {
      setAnnouncement(a11yT('enabledAnnounce', lang))
      const id = window.setTimeout(() => setAnnouncement(''), 4000)
      wasActive.current = active
      return () => window.clearTimeout(id)
    }
    wasActive.current = active
  }, [active, lang])

  return (
    <A11yPortal>
      <div className="a11yw-sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
      <Hint
        shown={active && hint === 'shown'}
        globe={globe}
        dir={dir}
        corner={corner}
        text={a11yT('reenableHint', lang)}
        onEnable={onEnable}
      />
    </A11yPortal>
  )
}

/** The bubble beside the globe (or, with no globe on the page, a pill in the
 *  launcher's corner). Kept mounted for its exit animation. */
function Hint({
  shown, globe, dir, corner, text, onEnable,
}: {
  shown: boolean
  globe: HTMLElement | null
  dir: 'rtl' | 'ltr'
  corner: A11yCorner
  text: string
  onEnable: () => void
}) {
  const { prefs } = useA11y()
  const skipMotion = usePrefersReducedMotion() || prefs.pauseAnimations
  const [mounted, setMounted] = useState(false)
  const rect = useElementRect(globe, mounted)

  useEffect(() => {
    if (shown) { setMounted(true); return }
    if (!mounted) return
    const id = window.setTimeout(() => setMounted(false), skipMotion ? 0 : 240)
    return () => window.clearTimeout(id)
  }, [shown, mounted, skipMotion])

  if (!mounted) return null
  const state = shown ? 'in' : 'out'

  // No globe on this page: a button in the launcher's corner. It is the
  // one hint that can be pressed, because here it is the way back.
  if (!globe) {
    return (
      <button
        type="button"
        className={`a11yw-hint a11yw-hint-fallback a11yw-hint-${corner}`}
        data-state={state}
        dir={dir}
        onClick={onEnable}
      >
        <HintIcon />
        <span>{text}</span>
      </button>
    )
  }

  // Not measured yet, or scrolled clean out of view: nothing to point at.
  const vw = document.documentElement.clientWidth || window.innerWidth
  const vh = window.innerHeight
  const onScreen = !!rect && rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw
  if (!rect || !onScreen) return null

  const side = hintSide(rect, vw)
  const gap = 12
  const room = side === 'right' ? vw - rect.right - gap - 12 : rect.left - gap - 12
  const style = {
    top: rect.top + rect.height / 2,
    maxWidth: Math.max(140, Math.min(280, room)),
    ...(side === 'right' ? { left: rect.right + gap } : { right: vw - rect.left + gap }),
  }

  return (
    <>
      <span
        className="a11yw-hint-ring"
        data-state={state}
        aria-hidden
        style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
      />
      {/* Not a button and not focusable: the globe is the control. Hidden from
          assistive tech because the menu item it points to says the same thing
          where a screen-reader visitor will actually find it. */}
      <div className="a11yw-hint" data-state={state} data-side={side} dir={dir} style={style} aria-hidden>
        <HintIcon />
        <span>{text}</span>
      </div>
    </>
  )
}

function HintIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="a11yw-hint-icon">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v1M9 12h6M12 12v5" />
    </svg>
  )
}
