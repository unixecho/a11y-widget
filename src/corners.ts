import type { A11yCorner } from './types'

// Arrow-key movement for the panel's corner picker. PURE — no DOM — so
// scripts/check-a11y.mjs can pin every transition the same way it pins the
// reducers in apply.ts.
//
// The picker is a 2×2 grid, so each axis has exactly two stops and "toward
// the left" from the right-hand column and "wrap around" from the left-hand
// one land on the same corner. That makes an arrow key's direction irrelevant
// beyond its axis: ←/→ flip left↔right, ↑/↓ flip top↔bottom. Physical, never
// logical — the grid is laid out in physical order regardless of text
// direction (the same rule the launcher itself follows), so ← must not
// secretly mean "next" under RTL.

export type CornerAxis = 'horizontal' | 'vertical'

export function flipCorner(corner: A11yCorner, axis: CornerAxis): A11yCorner {
  const top = corner.startsWith('top')
  const left = corner.endsWith('left')
  const nextTop = axis === 'vertical' ? !top : top
  const nextLeft = axis === 'horizontal' ? !left : left
  return `${nextTop ? 'top' : 'bottom'}-${nextLeft ? 'left' : 'right'}`
}
