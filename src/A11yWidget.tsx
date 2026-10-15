'use client'

import { useCallback, useEffect, useMemo, useReducer } from 'react'
import A11yProvider, { useA11y } from './A11yProvider'
import A11yLauncher from './A11yLauncher'
import A11yPanel from './A11yPanel'
import A11yToast from './A11yToast'
import A11yDisableNotice from './A11yDisableNotice'
import A11yReEnable from './A11yReEnable'
import ReadingGuide from './ReadingGuide'
import { useAvoidingCorner } from './internal/avoid'
import { isKeyboardFocus } from './internal/focus'
import { findLocaleButton, localeSelectors, toSelectorList } from './internal/locale'
import { usePrefersReducedMotion } from './internal/motion'
import { whenPageSettled } from './internal/settle'
import {
  INITIAL_LAUNCHER_STATE, LAUNCHER_ENTER_MS, LAUNCHER_LEAVE_MS, launcherReducer,
} from './lifecycle'
import { A11Y_SHORTCUT_KEY, type A11yWidgetConfig } from './types'

// The one import a host page needs. Mount as a sibling of the app's own
// `#a11y-scope` wrapper (both direct children of <body>) — see the
// package README's integration contract for exactly why.

export default function A11yWidget({ config = {} }: { config?: A11yWidgetConfig }) {
  return (
    <A11yProvider config={config}>
      <A11yWidgetInner />
    </A11yProvider>
  )
}

function A11yWidgetInner() {
  const { prefs, ready, corner, introSeen, markIntroSeen, disabled: storedDisabled, setDisabled, config } = useA11y()
  // "Pause animations" is the widget's own preference and it flattens every
  // animation to ~0ms — the unmount timers below must not wait out an outro
  // the visitor has switched off, any more than one the OS has.
  const skipMotion = usePrefersReducedMotion() || prefs.pauseAnimations
  const [state, dispatch] = useReducer(launcherReducer, INITIAL_LAUNCHER_STATE)

  // The first entrance waits for hydration (`ready`), so the launcher never
  // shows in the default corner for a frame before jumping to the visitor's
  // own. The intro is chosen ONCE, here, at the moment hydration completes:
  // `introSeen` flips to true a tick later (we mark it ourselves, right now —
  // the intro counts as seen from the moment it starts, so a visitor who
  // leaves mid-intro is not shown it again), and re-deriving it from that
  // would cut the animation short.
  //
  // A visitor who turned the widget off last time gets no launcher at all, so
  // the intro has not played for them — it is not marked seen.
  useEffect(() => {
    if (!ready) return
    dispatch({ type: 'READY', firstVisit: !introSeen, disabled: storedDisabled })
    if (!introSeen && !storedDisabled) markIntroSeen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // The reducer is the authority on "off" while the page is open; this writes
  // its answer to storage so the next load starts the same way. Not before READY:
  // until then the reducer's `disabled` is just its initial false, and writing
  // that would erase the very setting READY is about to read.
  useEffect(() => {
    if (state.phase !== 'pending') setDisabled(state.disabled)
  }, [state.phase, state.disabled, setDisabled])

  // Never draw over the host's own buttons (back, cart, the locale globe…): the
  // launcher takes the nearest free corner and the existing glide moves it there.
  const named = useMemo(
    () => [...toSelectorList(config.avoid), ...localeSelectors(config.localeButton)],
    [config.avoid, config.localeButton],
  )
  const placedCorner = useAvoidingCorner(corner, state.phase !== 'pending' && !state.disabled, named)

  // F2 opens/closes the panel — the same shortcut commercial accessibility
  // widgets use, so a visitor arriving from another site with the habit
  // already gets it here. While the launcher is hidden it brings it back (and
  // opens the panel: pressing the accessibility key is asking for the
  // accessibility menu). Escape-to-close is the sheet's own job (A11ySheet).
  // This listener lives HERE, not on the launcher, so it keeps working while
  // the launcher is unmounted — it is the way back. It must never hijack
  // typing, so it stands down when focus is in an editable field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== A11Y_SHORTCUT_KEY) return
      const active = document.activeElement
      const typing = active instanceof HTMLElement && (
        active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable
      )
      if (typing) return
      e.preventDefault()
      dispatch({ type: 'TOGGLE' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The timers. The reducer only says what follows what; these say when.
  useEffect(() => {
    if (state.phase !== 'entering') return
    const id = window.setTimeout(() => dispatch({ type: 'ENTERED' }), skipMotion ? 0 : LAUNCHER_ENTER_MS)
    return () => window.clearTimeout(id)
  }, [state.phase, state.epoch, skipMotion])

  useEffect(() => {
    if (state.phase !== 'leaving') return
    const id = window.setTimeout(() => dispatch({ type: 'LEFT' }), skipMotion ? 0 : LAUNCHER_LEAVE_MS)
    return () => window.clearTimeout(id)
  }, [state.phase, skipMotion])

  // The notice waits for the launcher's outro (phase `hidden`) and then for the
  // page itself to stop moving, so it never lands on a load-in or a transition.
  useEffect(() => {
    if (state.notice !== 'pending' || state.phase !== 'hidden') return
    return whenPageSettled(() => dispatch({ type: 'NOTICE_OPEN' }))
  }, [state.notice, state.phase])

  const open = useCallback(() => dispatch({ type: 'OPEN' }), [])
  const close = useCallback(() => dispatch({ type: 'CLOSE' }), [])
  const hide = useCallback(() => {
    // If a KEYBOARD visitor hid it from inside the panel, their focus is about to
    // vanish with it — the toast's button takes it instead of <body> getting it.
    //
    // "Keyboard" matters: the panel moves focus to its first control by script
    // the moment it opens, so after a TAP `document.activeElement` is still in
    // the panel even though no keyboard is involved. Treating that as keyboard
    // handed the toast focus it had no use for — and a focused toast holds its
    // own dismiss clock, so on a phone it never closed (1.1.0, found live).
    const active = document.activeElement
    const fromPanel = active instanceof HTMLElement && active.closest('.a11yw-panel') !== null
    dispatch({ type: 'HIDE', focusToast: fromPanel && isKeyboardFocus(active) })
  }, [])
  const restore = useCallback(() => dispatch({ type: 'SHOW', focusLauncher: true }), [])
  const dismissToast = useCallback(() => dispatch({ type: 'TOAST_DISMISS' }), [])
  const toastGone = useCallback(() => dispatch({ type: 'TOAST_GONE' }), [])

  const disable = useCallback(() => dispatch({ type: 'DISABLE' }), [])
  // From the globe's menu: the button comes back, the visitor stays where they are.
  const enableFromGlobe = useCallback(() => dispatch({ type: 'ENABLE', focusLauncher: false }), [])
  // From the notice's Undo: the notice was holding focus, so the button takes it.
  const undoDisable = useCallback(() => dispatch({ type: 'ENABLE', focusLauncher: true }), [])
  const showHint = useCallback(() => dispatch({ type: 'HINT_SHOW' }), [])
  const hintDone = useCallback(() => dispatch({ type: 'HINT_DONE' }), [])
  const closeNotice = useCallback(() => {
    dispatch({ type: 'NOTICE_CLOSE' })
    // Focus goes to the globe: it is the way back the notice just described, and
    // dropping a keyboard visitor onto <body> would lose their place.
    findLocaleButton(localeSelectors(config.localeButton))?.focus({ preventScroll: true })
  }, [config.localeButton])

  const { phase } = state
  const launcherPhase = phase === 'entering' || phase === 'visible' || phase === 'leaving' ? phase : null

  return (
    <>
      {launcherPhase && (
        <A11yLauncher
          // Remounts on every (re)entrance, so the entrance plays from frame
          // zero instead of morphing out of whatever the outro left behind.
          key={state.epoch}
          corner={placedCorner}
          open={state.open}
          onOpen={open}
          phase={launcherPhase}
          intro={state.intro}
          autoFocus={state.focusLauncher}
        />
      )}
      <A11yPanel
        open={state.open}
        onClose={close}
        onHide={hide}
        onDisable={disable}
        // Closing to hide the launcher: its opener is leaving, nothing to return to.
        restoreFocus={phase === 'entering' || phase === 'visible'}
      />
      <A11yToast
        phase={state.toast}
        corner={placedCorner}
        autoFocus={state.focusToast}
        onRestore={restore}
        onDismiss={dismissToast}
        onGone={toastGone}
      />
      <A11yDisableNotice open={state.notice === 'open'} onClose={closeNotice} onUndo={undoDisable} />
      <A11yReEnable
        active={state.disabled}
        hint={state.hint}
        onHintShow={showHint}
        onHintDone={hintDone}
        onEnable={enableFromGlobe}
        corner={placedCorner}
      />
      {prefs.readingGuide && <ReadingGuide />}
    </>
  )
}
