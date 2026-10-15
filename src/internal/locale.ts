'use client'

import { useEffect, useRef, useState } from 'react'
import { DEFAULT_LOCALE_SELECTORS } from '../types'

// Finding the host's locale (globe) button, and following it around.
//
// The widget does not own this button — the host does — so everything here is
// read-only observation, except for the one menu item globeMenu.ts adds.

/** `config.localeButton` / `config.avoid` accept one selector or a list. */
export function toSelectorList(v: string | readonly string[] | undefined): string[] {
  if (!v) return []
  return (typeof v === 'string' ? [v] : [...v]).map((s) => s.trim()).filter(Boolean)
}

export function localeSelectors(configured: string | readonly string[] | undefined): string[] {
  const list = toSelectorList(configured)
  return list.length ? list : [...DEFAULT_LOCALE_SELECTORS]
}

/** Laid out, drawn, and not a zero-size placeholder. */
export function isVisible(el: Element): boolean {
  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) return false
  const cs = getComputedStyle(el)
  return cs.display !== 'none' && cs.visibility !== 'hidden'
}

/** `querySelectorAll` that ignores a selector the browser rejects — a typo in a
 *  host's config must cost it that selector, not the whole widget. */
export function queryAll(selector: string): Element[] {
  try {
    return Array.from(document.querySelectorAll(selector))
  } catch {
    return []
  }
}

/** The first visible element any of the selectors matches, in the order given. */
export function findLocaleButton(selectors: readonly string[]): HTMLElement | null {
  for (const sel of selectors) {
    for (const el of queryAll(sel)) {
      if (el instanceof HTMLElement && isVisible(el)) return el
    }
  }
  return null
}

/** The globe button, re-found whenever the page changes (a client-side route
 *  change replaces it; the host may not draw it until its data has loaded). */
export function useLocaleButton(selectors: readonly string[], enabled: boolean): HTMLElement | null {
  const [el, setEl] = useState<HTMLElement | null>(null)
  // A new array every render must not restart the observer.
  const key = selectors.join('\n')
  const selRef = useRef(selectors)
  selRef.current = selectors

  useEffect(() => {
    if (!enabled) { setEl(null); return }
    let timer = 0
    const find = () => {
      timer = 0
      const next = findLocaleButton(selRef.current)
      setEl((prev) => (prev === next ? prev : next))
    }
    const schedule = () => { if (!timer) timer = window.setTimeout(find, 100) }
    find()
    const mo = new MutationObserver(schedule)
    mo.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', schedule)
    return () => {
      mo.disconnect()
      window.removeEventListener('resize', schedule)
      window.clearTimeout(timer)
    }
  }, [enabled, key])

  return el
}

/** Where an element is, kept current while it scrolls, resizes or moves. */
export function useElementRect(el: HTMLElement | null, enabled: boolean): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!el || !enabled) { setRect(null); return }
    let raf = 0
    const read = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      setRect((prev) => (
        prev && prev.left === r.left && prev.top === r.top && prev.width === r.width && prev.height === r.height
          ? prev : r
      ))
    }
    // A timeout stands in for requestAnimationFrame in a page that is not
    // painting; whichever fires first wins.
    const schedule = () => {
      if (raf) return
      raf = window.setTimeout(read, 16)
    }
    read()
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    document.addEventListener('transitionend', schedule, true)
    document.addEventListener('animationend', schedule, true)
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null
    ro?.observe(el)
    return () => {
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('transitionend', schedule, true)
      document.removeEventListener('animationend', schedule, true)
      ro?.disconnect()
      window.clearTimeout(raf)
    }
  }, [el, enabled])

  return rect
}
