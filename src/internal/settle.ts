// "Wait until the page has stopped moving" — so the widget's own messages never
// land on top of the host's load-in or page-transition animations.
//
// WHY ASK THE BROWSER AND NOT GUESS A DELAY: hosts differ (Ayeka's staggered
// `.rise` entrances, Sarcafe's intro, a route transition…) and a fixed timeout is
// either too short for the slow page or wastefully long for the quiet one.
// `document.getAnimations()` is the browser's own list of every running CSS
// animation, CSS transition and Web Animation on the page, so "none of them are
// running" is exactly "nothing is still moving".
//
// What does NOT count, on purpose:
//   • infinite animations (a spinner, a pulsing glow) — they never finish, so
//     waiting for them would mean waiting forever;
//   • anything past `maxWaitMs` — a page with a 60-second animation is not going
//     to hold the visitor's message hostage. The wait is capped.
// A short QUIET stretch is required, not a single clear instant: staggered
// entrances start their animations in waves, and one wave ending between two
// others must not read as "done".
//
// Timers, not requestAnimationFrame: rAF never fires in a page that is not
// painting (a background tab), and this must still resolve.

export interface SettleOptions {
  /** How long nothing may be running before the page counts as settled. */
  quietMs?: number
  /** Give up waiting after this long and carry on anyway. */
  maxWaitMs?: number
  /** How often to look. */
  pollMs?: number
}

export const SETTLE_QUIET_MS = 250
export const SETTLE_MAX_WAIT_MS = 8_000
const POLL_MS = 80

/** Finite animations that are still going. Pure with respect to its input so
 *  the logic is the same wherever it is called. */
export function runningFinite(animations: readonly Animation[]): Animation[] {
  return animations.filter((a) => {
    if (a.playState !== 'running') return false
    const timing = a.effect?.getComputedTiming?.()
    return !!timing && Number.isFinite(timing.endTime)
  })
}

/** Calls `done` once the page has been still for `quietMs` (and has finished
 *  loading), or after `maxWaitMs` regardless. Returns a cancel function —
 *  call it from an effect cleanup so a stale wait can never fire late. */
export function whenPageSettled(done: () => void, opts: SettleOptions = {}): () => void {
  const quietMs = opts.quietMs ?? SETTLE_QUIET_MS
  const maxWaitMs = opts.maxWaitMs ?? SETTLE_MAX_WAIT_MS
  const pollMs = opts.pollMs ?? POLL_MS
  const startedAt = Date.now()
  let quietSince: number | null = null
  let timer = 0
  let cancelled = false

  const finish = () => {
    if (cancelled) return
    cancelled = true
    done()
  }

  const tick = () => {
    if (cancelled) return
    const now = Date.now()
    if (now - startedAt >= maxWaitMs) return finish()
    const moving = typeof document.getAnimations === 'function'
      ? runningFinite(document.getAnimations()).length > 0
      : false
    // A page still loading is not still, whatever its animations are doing.
    const loading = document.readyState !== 'complete'
    if (moving || loading) {
      quietSince = null
    } else if (quietSince === null) {
      quietSince = now
    } else if (now - quietSince >= quietMs) {
      return finish()
    }
    timer = window.setTimeout(tick, pollMs)
  }

  timer = window.setTimeout(tick, 0)
  return () => { cancelled = true; window.clearTimeout(timer) }
}
