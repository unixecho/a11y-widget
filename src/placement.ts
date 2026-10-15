import { flipCorner } from './corners'
import type { A11yCorner } from './types'

// Where the launcher goes when something of the host's is already there.
// PURE — no DOM — so scripts/check-a11y.mjs can pin it the same way it pins the
// lifecycle reducer; internal/avoid.ts is the DOM half that finds the blockers.
//
// The launcher sits in one of four physical corners (16px in from each edge,
// 48px square). A host page has its own things in those corners — a back
// button, a cart, the locale globe, a tab bar. The visitor's chosen corner is
// the one we WANT; if a blocker is in it we take the nearest corner that is
// free: across first (same row — the launcher glides sideways, the least it
// can move), then up/down, then the diagonal.

export interface Box { left: number; top: number; right: number; bottom: number }

export const LAUNCHER_SIZE = 48
/** Distance from the screen edge — matches `.a11y-fab-*` in internal/style.ts. */
export const LAUNCHER_EDGE = 16
/** Clear air to keep between the launcher and anything it avoids, so it never
 *  touches a neighbour's tap target. */
export const AVOID_GAP = 8

/** The launcher's box in a corner. `insets` are the safe-area insets the CSS
 *  adds to the vertical edges. */
export function cornerBox(
  corner: A11yCorner,
  viewport: { width: number; height: number },
  insets: { top: number; bottom: number } = { top: 0, bottom: 0 },
): Box {
  const top = corner.startsWith('top')
  const left = corner.endsWith('left')
  const l = left ? LAUNCHER_EDGE : viewport.width - LAUNCHER_EDGE - LAUNCHER_SIZE
  const t = top ? insets.top + LAUNCHER_EDGE : viewport.height - insets.bottom - LAUNCHER_EDGE - LAUNCHER_SIZE
  return { left: l, top: t, right: l + LAUNCHER_SIZE, bottom: t + LAUNCHER_SIZE }
}

/** Preferred corner first, then the order the launcher would rather move in. */
export function candidateCorners(preferred: A11yCorner): A11yCorner[] {
  const across = flipCorner(preferred, 'horizontal')
  const vertical = flipCorner(preferred, 'vertical')
  return [preferred, across, vertical, flipCorner(across, 'vertical')]
}

/** Area of `a` and `b` overlapping once `a` is grown by `gap` on every side. */
export function overlapArea(a: Box, b: Box, gap = AVOID_GAP): number {
  const w = Math.min(a.right + gap, b.right) - Math.max(a.left - gap, b.left)
  const h = Math.min(a.bottom + gap, b.bottom) - Math.max(a.top - gap, b.top)
  return w > 0 && h > 0 ? w * h : 0
}

/** Which side of an anchor a hint goes: the side with the most room, which on a
 *  button pinned to the left edge is its right, and vice versa. Physical, never
 *  logical — the same rule the launcher follows. */
export function hintSide(anchor: Pick<Box, 'left' | 'right'>, viewportWidth: number): 'left' | 'right' {
  return (anchor.left + anchor.right) / 2 < viewportWidth / 2 ? 'right' : 'left'
}

/** The corner the launcher should sit in: the preferred one if nothing of the
 *  host's is in it, else the first free candidate. If every corner is taken it
 *  settles for the one with the least covered (ties go to the earlier, so the
 *  preferred corner wins a dead heat) rather than hopping about. */
export function pickCorner(
  preferred: A11yCorner,
  blockers: readonly Box[],
  viewport: { width: number; height: number },
  insets: { top: number; bottom: number } = { top: 0, bottom: 0 },
): A11yCorner {
  let best = preferred
  let bestCovered = Infinity
  for (const corner of candidateCorners(preferred)) {
    const box = cornerBox(corner, viewport, insets)
    let covered = 0
    for (const b of blockers) covered += overlapArea(box, b)
    if (covered === 0) return corner
    if (covered < bestCovered) { best = corner; bestCovered = covered }
  }
  return best
}
