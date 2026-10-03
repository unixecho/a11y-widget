'use client'

import { useEffect, useState } from 'react'

// The CSS side of reduced motion is a `@media (prefers-reduced-motion)` block
// next to each animation (internal/style.ts). This is the JS side: the
// launcher and toast unmount on timers, and a timer that waits out an
// animation which CSS has already switched off is a button that lingers for
// no reason. Reads the same media query, so the two cannot disagree.
//
// `false` until mounted — matches the server render, so there is no hydration
// mismatch; the effect corrects it on the first client tick, which is before
// any launcher timer can matter.

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setReduced(mq.matches)
    read()
    // Older Safari only has the deprecated addListener/removeListener pair.
    if (mq.addEventListener) {
      mq.addEventListener('change', read)
      return () => mq.removeEventListener('change', read)
    }
    mq.addListener(read)
    return () => mq.removeListener(read)
  }, [])

  return reduced
}
