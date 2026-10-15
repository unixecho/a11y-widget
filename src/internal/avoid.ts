'use client'

import { useEffect, useRef, useState } from 'react'
import { pickCorner, cornerBox, overlapArea, AVOID_GAP, type Box } from '../placement'
import { A11Y_CORNERS, type A11yCorner } from '../types'
import { isVisible, queryAll } from './locale'

// The DOM half of "never draw over the host's own buttons" — the decision
// itself (which corner is free) is placement.ts, pure and under test.
//
// WHAT COUNTS AS IN THE WAY, found without the host having to say:
//   • every visible button / link / control that is PINNED — it, or something it
//     sits in, is `position: fixed` or `sticky` — and that reaches one of the four
//     corners. That is what a back button, a cart, a tab bar, a chat bubble and a
//     language globe all have in common. An ordinary button in the page's flow
//     scrolls under a corner and away again; chasing it would have the launcher
//     skipping about as the visitor reads.
//   • anything that matches `config.avoid`, or carries `data-a11y-avoid`, or is
//     the locale button — named outright, so they count even when not pinned.
// Never counted: the widget's own UI, and anything that cannot be tapped or seen
// (display:none, visibility:hidden, pointer-events:none).
//
// WHEN IT LOOKS: on mount, on resize/scroll, whenever the page's markup changes
// and whenever a transition or animation ends (a cart that fades in, a banner
// that slides away). Every trigger is funnelled through one short trailing timer
// so a burst of them is one look. The corner it picks is just the launcher's
// `corner` prop — the existing glide (A11yLauncher) does the smooth move.

const CONTROLS = [
  'button', 'a[href]', '[role="button"]', '[role="link"]', '[role="tab"]',
  'input:not([type="hidden"])', 'select', 'summary',
].join(',')

/** Marks something that is not a control but must still be kept clear of. */
export const AVOID_ATTRIBUTE = 'data-a11y-avoid'

const LOOK_DELAY_MS = 100

const OWN_UI = '.a11y-fab, [class*="a11yw-"]'

function isPinned(el: Element): boolean {
  for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
    const position = getComputedStyle(node).position
    if (position === 'fixed' || position === 'sticky') return true
  }
  return false
}

function toBox(r: DOMRect): Box {
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
}

/** The viewport's safe-area insets, in px — read by letting the browser resolve
 *  `env()` on a probe, since the CSS the launcher uses is in `env()` too. */
function readInsets(probe: HTMLElement): { top: number; bottom: number } {
  const cs = getComputedStyle(probe)
  return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 }
}

export function collectBlockers(
  viewport: { width: number; height: number },
  insets: { top: number; bottom: number },
  named: readonly string[],
): Box[] {
  const blockers: Box[] = []

  // Named outright: no need to be pinned, only to be on screen.
  const seen = new Set<Element>()
  for (const sel of [`[${AVOID_ATTRIBUTE}]`, ...named]) {
    for (const el of queryAll(sel)) {
      if (seen.has(el) || el.closest(OWN_UI) || !isVisible(el)) continue
      seen.add(el)
      blockers.push(toBox(el.getBoundingClientRect()))
    }
  }

  // Found by itself: only controls that reach a corner can matter, so each is
  // measured against the four corner boxes before anything costlier is asked.
  const zones = A11Y_CORNERS.map((c) => cornerBox(c, viewport, insets))
  for (const el of queryAll(CONTROLS)) {
    if (seen.has(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) continue
    const box = toBox(r)
    if (!zones.some((z) => overlapArea(z, box, AVOID_GAP) > 0)) continue
    if (el.closest(OWN_UI)) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue
    if (!isPinned(el)) continue
    blockers.push(box)
  }
  return blockers
}

/** The corner the launcher should actually sit in: `preferred` unless something
 *  of the host's is already there, in which case the nearest free one. */
export function useAvoidingCorner(
  preferred: A11yCorner,
  enabled: boolean,
  named: readonly string[],
): A11yCorner {
  // Remembered with the corner it was worked out FOR: when the visitor picks a
  // different corner the old answer must not be shown for even one render, or
  // the launcher would glide to the wrong place first.
  const [placed, setPlaced] = useState<{ for: A11yCorner; corner: A11yCorner }>({ for: preferred, corner: preferred })
  const namedKey = named.join('\n')
  const namedRef = useRef(named)
  namedRef.current = named

  useEffect(() => {
    if (!enabled) return
    const probe = document.createElement('div')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
    document.body.appendChild(probe)

    let timer = 0
    const look = () => {
      timer = 0
      const viewport = { width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight }
      const blockers = collectBlockers(viewport, readInsets(probe), namedRef.current)
      const corner = pickCorner(preferred, blockers, viewport, readInsets(probe))
      setPlaced((prev) => (prev.for === preferred && prev.corner === corner ? prev : { for: preferred, corner }))
    }
    const schedule = () => { if (!timer) timer = window.setTimeout(look, LOOK_DELAY_MS) }

    look()
    const mo = new MutationObserver(schedule)
    mo.observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'open'],
    })
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    document.addEventListener('transitionend', schedule, true)
    document.addEventListener('animationend', schedule, true)
    window.addEventListener('load', schedule)
    return () => {
      mo.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
      document.removeEventListener('transitionend', schedule, true)
      document.removeEventListener('animationend', schedule, true)
      window.removeEventListener('load', schedule)
      window.clearTimeout(timer)
      probe.remove()
    }
  }, [enabled, preferred, namedKey])

  if (!enabled) return preferred
  return placed.for === preferred ? placed.corner : preferred
}
