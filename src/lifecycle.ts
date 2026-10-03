// The launcher's lifecycle — mount, idle, hide, restore — as a pure reducer.
//
// WHY A REDUCER AND NOT A FEW useState FLAGS: hiding the widget touches five
// things at once (the panel closes, the launcher plays its outro, a toast
// appears, focus has to land somewhere sensible, the F2 key changes meaning),
// and "what if F2 is pressed while the outro is still playing?" is exactly the
// kind of question that quietly becomes a bug in a handful of booleans. Here
// every transition is one line of a switch, and scripts/check-a11y.mjs fires
// random action sequences at it to hold the invariants below.
//
// Timers are NOT in here — A11yWidget owns them (an effect per timed phase).
// This file only says what state follows what event.
//
// DELIBERATELY NOT PERSISTED: whether the launcher is hidden lives in memory
// only, so a page refresh always brings it back. A hide that survived reloads
// could lock out a visitor who hid it by accident and *does* need it, and
// "just refresh" is the one recovery that needs no keyboard and no
// discoverability. (Next.js client-side navigation keeps the widget mounted,
// so it also stays hidden while the visitor browses around — it only returns
// on a real reload, which is the behaviour a visitor who hid it expects.)

// ── timings shared by the timers (A11yWidget/A11yToast) and the CSS ──────────
// The CSS durations in internal/style.ts are written to match these; the
// timers use them to know when to unmount, never to drive the animation.

/** Longest entrance (delay + spring). Only used to know when the button has
 *  settled — FLIP never measures a launcher that is still mid-pop. */
export const LAUNCHER_ENTER_MS = 1200
export const LAUNCHER_LEAVE_MS = 380
/** Long enough to read a title, a hint and a second hint without rushing;
 *  hover/focus pauses it, and a toast that holds focus never times out. */
export const TOAST_VISIBLE_MS = 10_000
export const TOAST_LEAVE_MS = 220

// ── state ─────────────────────────────────────────────────────────────────

/** `pending` = not hydrated yet, so there is no launcher to show.
 *  `entering`/`visible` = the launcher exists and is usable.
 *  `leaving` = the outro is playing (launcher still mounted, inert).
 *  `hidden` = gone; only the F2 listener and the toast remain. */
export type LauncherPhase = 'pending' | 'entering' | 'visible' | 'leaving' | 'hidden'
export type ToastPhase = 'none' | 'in' | 'out'
/** `full` = the first-visit intro (pop, pulse, label). `quick` = every later
 *  entrance, including a restore: the pop alone. */
export type IntroKind = 'full' | 'quick'

export interface LauncherState {
  phase: LauncherPhase
  /** Panel open. Only ever true while the launcher is `entering`/`visible`. */
  open: boolean
  toast: ToastPhase
  intro: IntroKind
  /** Bumped on every (re)entrance. Used as the launcher's React key so a
   *  restore remounts it and the entrance animation plays from frame zero,
   *  rather than morphing out of whatever the outro left behind. */
  epoch: number
  /** The hide came from inside the panel, so the toast's action should take
   *  focus — the panel and launcher that held it are gone, and dropping a
   *  keyboard user onto <body> would lose their place. */
  focusToast: boolean
  /** The restore came from the toast, so the returning launcher takes focus. */
  focusLauncher: boolean
}

export const INITIAL_LAUNCHER_STATE: LauncherState = {
  phase: 'pending',
  open: false,
  toast: 'none',
  intro: 'quick',
  epoch: 0,
  focusToast: false,
  focusLauncher: false,
}

export type LauncherAction =
  | { type: 'READY'; firstVisit: boolean }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  /** The F2 key. Opens/closes the panel; while hidden, restores AND opens. */
  | { type: 'TOGGLE' }
  | { type: 'HIDE'; focusToast: boolean }
  | { type: 'SHOW'; focusLauncher: boolean }
  | { type: 'ENTERED' }
  | { type: 'LEFT' }
  | { type: 'TOAST_DISMISS' }
  | { type: 'TOAST_GONE' }

const interactive = (p: LauncherPhase) => p === 'entering' || p === 'visible'
const away = (p: LauncherPhase) => p === 'leaving' || p === 'hidden'

function show(s: LauncherState, open: boolean, focusLauncher: boolean): LauncherState {
  return {
    ...s,
    phase: 'entering',
    intro: 'quick',
    open,
    epoch: s.epoch + 1,
    focusLauncher,
    focusToast: false,
    // A toast still on screen has done its job the moment the launcher is
    // back — it leaves instead of lingering next to the thing it described.
    toast: s.toast === 'in' ? 'out' : s.toast,
  }
}

/** Invariants, held by every transition below and checked by the harness:
 *    1. `open` implies the launcher is `entering`/`visible`.
 *    2. `toast === 'in'` implies the launcher is `leaving`/`hidden`.
 *    3. `epoch` only ever increases.
 *    4. `pending` is only ever the initial phase. */
export function launcherReducer(s: LauncherState, a: LauncherAction): LauncherState {
  switch (a.type) {
    case 'READY':
      if (s.phase !== 'pending') return s
      return { ...s, phase: 'entering', intro: a.firstVisit ? 'full' : 'quick', epoch: s.epoch + 1 }

    case 'OPEN':
      return interactive(s.phase) && !s.open ? { ...s, open: true } : s

    case 'CLOSE':
      return s.open ? { ...s, open: false } : s

    case 'TOGGLE':
      if (interactive(s.phase)) return { ...s, open: !s.open }
      if (away(s.phase)) return show(s, true, false)
      return s

    case 'HIDE':
      if (!interactive(s.phase)) return s
      return { ...s, phase: 'leaving', open: false, toast: 'in', focusToast: a.focusToast }

    case 'SHOW':
      return away(s.phase) ? show(s, false, a.focusLauncher) : s

    case 'ENTERED':
      return s.phase === 'entering' ? { ...s, phase: 'visible' } : s

    case 'LEFT':
      return s.phase === 'leaving' ? { ...s, phase: 'hidden' } : s

    case 'TOAST_DISMISS':
      return s.toast === 'in' ? { ...s, toast: 'out' } : s

    case 'TOAST_GONE':
      return s.toast === 'out' ? { ...s, toast: 'none' } : s
  }
}
