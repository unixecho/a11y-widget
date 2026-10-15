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
// TWO WAYS TO MAKE THE BUTTON GO AWAY, AND ONLY ONE IS REMEMBERED:
//   • HIDE ("Hide this button") lives in memory only, so a page refresh always
//     brings the button back. A hide that survived reloads could lock out a
//     visitor who hid it by accident and *does* need it, and "just refresh" is
//     the one recovery that needs no keyboard and no discoverability.
//     (Next.js client-side navigation keeps the widget mounted, so it also stays
//     hidden while the visitor browses around — it only returns on a real
//     reload, which is the behaviour a visitor who hid it expects.)
//   • DISABLE ("Turn off the widget") IS remembered — storage.ts keeps it — so
//     the widget stays off on every later load. That is the whole point of it,
//     and it is why it never leaves the visitor without a way back: the host's
//     locale (globe) button gets an "enable" item, a hint points at the globe on
//     every load, and the shortcut key works too. After turning it off, a notice
//     explains all of that — once the page has stopped animating (settle.ts).

// ── timings shared by the timers (A11yWidget/A11yToast) and the CSS ──────────
// The CSS durations in internal/style.ts are written to match these; the
// timers use them to know when to unmount, never to drive the animation.

/** Longest entrance (delay + spring). Only used to know when the button has
 *  settled — FLIP never measures a launcher that is still mid-pop. */
export const LAUNCHER_ENTER_MS = 1200
export const LAUNCHER_LEAVE_MS = 380
/** How long the toast stays before it closes ITSELF — with a countdown ring on
 *  its close button, so the visitor can see it coming (the way Waze's prompts
 *  do). 1.1.0 used 10s and, worse, froze the clock on any focus, so a toast
 *  opened by a tap never closed at all; 5s is enough to read the title and the
 *  way back, and the clock is held only while the visitor is actually engaging
 *  with it (see `toastHeld`), which is what keeps a short timer honest under
 *  WCAG 2.2.1 (Timing Adjustable). Must stay >= 5000 — the harness holds it. */
export const TOAST_VISIBLE_MS = 5_000
export const TOAST_LEAVE_MS = 220
/** How long the "enable it here" hint stays beside the globe on a load where the
 *  widget is off. Long enough to read a short line in any of the three languages,
 *  short enough that it never feels like it is nagging. */
export const REENABLE_HINT_MS = 9_000

/** What the visitor is doing to the toast right now. */
export interface ToastEngagement {
  /** A MOUSE is over it. Deliberately not "any pointer is over it": on touch,
   *  `pointerenter` fires for the tap and no hover ever ends, so counting it
   *  would freeze the clock for every touch visitor. */
  mouseOver: boolean
  /** A pointer of any kind is held DOWN on it — touch-and-hold keeps it open,
   *  the way a story pauses under a finger. Released = the clock resumes. */
  pressed: boolean
  /** Focus is inside it AND is keyboard focus (`isKeyboardFocus`). Focus that
   *  the page moved there on its own does not count. */
  keyboardFocus: boolean
}

/** Does the visitor's engagement hold the dismiss clock? Pure, so the rule that
 *  decides whether a touch visitor's toast ever closes is under test. */
export function toastHeld(e: ToastEngagement): boolean {
  return e.mouseOver || e.pressed || e.keyboardFocus
}

// ── state ─────────────────────────────────────────────────────────────────

/** `pending` = not hydrated yet, so there is no launcher to show.
 *  `entering`/`visible` = the launcher exists and is usable.
 *  `leaving` = the outro is playing (launcher still mounted, inert).
 *  `hidden` = gone; only the F2 listener and the toast remain. */
export type LauncherPhase = 'pending' | 'entering' | 'visible' | 'leaving' | 'hidden'
export type ToastPhase = 'none' | 'in' | 'out'
/** The notice that explains how to turn the widget back on. `pending` = the
 *  visitor has just turned it off and we are waiting for the page to stop
 *  animating; `open` = it is on screen. */
export type NoticePhase = 'none' | 'pending' | 'open'
/** The hint beside the globe on a load where the widget is off. `pending` =
 *  waiting for the globe to exist and the page to settle; `shown` = visible. */
export type HintPhase = 'none' | 'pending' | 'shown'
/** `full` = the first-visit intro (pop, pulse, label). `quick` = every later
 *  entrance, including a restore: the pop alone. */
export type IntroKind = 'full' | 'quick'

export interface LauncherState {
  phase: LauncherPhase
  /** Panel open. Only ever true while the launcher is `entering`/`visible`. */
  open: boolean
  toast: ToastPhase
  /** The visitor has the widget turned off (mirrors the persisted setting). */
  disabled: boolean
  notice: NoticePhase
  hint: HintPhase
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
  disabled: false,
  notice: 'none',
  hint: 'none',
  intro: 'quick',
  epoch: 0,
  focusToast: false,
  focusLauncher: false,
}

export type LauncherAction =
  | { type: 'READY'; firstVisit: boolean; disabled: boolean }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  /** The F2 key. Opens/closes the panel; while hidden, restores AND opens. */
  | { type: 'TOGGLE' }
  | { type: 'HIDE'; focusToast: boolean }
  | { type: 'SHOW'; focusLauncher: boolean }
  /** "Turn off the widget": persisted, unlike HIDE. */
  | { type: 'DISABLE' }
  /** Turn it back on (the globe's menu item). Not a restore-and-open: the panel
   *  stays closed, the button just comes back. */
  | { type: 'ENABLE'; focusLauncher: boolean }
  | { type: 'NOTICE_OPEN' }
  | { type: 'NOTICE_CLOSE' }
  | { type: 'HINT_SHOW' }
  | { type: 'HINT_DONE' }
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
    // Bringing the button back by any route turns the widget on — and a notice
    // or hint about it being off has nothing left to say.
    disabled: false,
    notice: 'none',
    hint: 'none',
    // A toast still on screen has done its job the moment the launcher is
    // back — it leaves instead of lingering next to the thing it described.
    toast: s.toast === 'in' ? 'out' : s.toast,
  }
}

/** Invariants, held by every transition below and checked by the harness:
 *    1. `open` implies the launcher is `entering`/`visible`.
 *    2. `toast === 'in'` implies the launcher is `leaving`/`hidden`.
 *    3. `epoch` only ever increases.
 *    4. `pending` is only ever the initial phase.
 *    5. A notice or hint is only ever up while the widget is `disabled`.
 *    6. `disabled` implies the launcher is `leaving`/`hidden` — a widget that is
 *       switched off never has a usable button. */
export function launcherReducer(s: LauncherState, a: LauncherAction): LauncherState {
  switch (a.type) {
    case 'READY':
      if (s.phase !== 'pending') return s
      // Switched off on a previous visit: there is no launcher to bring in. The
      // hint beside the globe is the one thing this load has to say.
      if (a.disabled) return { ...s, phase: 'hidden', disabled: true, hint: 'pending', epoch: s.epoch + 1 }
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

    case 'DISABLE':
      if (s.disabled || s.phase === 'pending') return s
      // From a visible launcher it plays the outro first; from an already-hidden
      // one (the toast may still be up) there is nothing left to play.
      return {
        ...s,
        phase: interactive(s.phase) ? 'leaving' : s.phase,
        open: false,
        disabled: true,
        notice: 'pending',
        hint: 'none',
        // The notice says everything the toast would: one voice, not two.
        toast: s.toast === 'in' ? 'out' : s.toast,
      }

    case 'ENABLE':
      return s.disabled ? show(s, false, a.focusLauncher) : s

    case 'NOTICE_OPEN':
      return s.notice === 'pending' && s.disabled && s.phase === 'hidden' ? { ...s, notice: 'open' } : s

    case 'NOTICE_CLOSE':
      return s.notice === 'none' ? s : { ...s, notice: 'none' }

    case 'HINT_SHOW':
      return s.hint === 'pending' && s.disabled ? { ...s, hint: 'shown' } : s

    case 'HINT_DONE':
      return s.hint === 'none' ? s : { ...s, hint: 'none' }

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
