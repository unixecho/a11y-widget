'use client'

import { useCallback, useEffect, useReducer } from 'react'
import A11yProvider, { useA11y } from './A11yProvider'
import A11yLauncher from './A11yLauncher'
import A11yPanel from './A11yPanel'
import A11yToast from './A11yToast'
import ReadingGuide from './ReadingGuide'
import { usePrefersReducedMotion } from './internal/motion'
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
  const { prefs, ready, corner, introSeen, markIntroSeen } = useA11y()
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
  useEffect(() => {
    if (!ready) return
    dispatch({ type: 'READY', firstVisit: !introSeen })
    if (!introSeen) markIntroSeen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

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

  const open = useCallback(() => dispatch({ type: 'OPEN' }), [])
  const close = useCallback(() => dispatch({ type: 'CLOSE' }), [])
  const hide = useCallback(() => {
    // If the hide came from inside the panel, the visitor's focus is about to
    // vanish with it — the toast's button takes it instead of <body> getting it.
    const active = document.activeElement
    const fromPanel = active instanceof HTMLElement && active.closest('.a11yw-panel') !== null
    dispatch({ type: 'HIDE', focusToast: fromPanel })
  }, [])
  const restore = useCallback(() => dispatch({ type: 'SHOW', focusLauncher: true }), [])
  const dismissToast = useCallback(() => dispatch({ type: 'TOAST_DISMISS' }), [])
  const toastGone = useCallback(() => dispatch({ type: 'TOAST_GONE' }), [])

  const { phase } = state
  const launcherPhase = phase === 'entering' || phase === 'visible' || phase === 'leaving' ? phase : null

  return (
    <>
      {launcherPhase && (
        <A11yLauncher
          // Remounts on every (re)entrance, so the entrance plays from frame
          // zero instead of morphing out of whatever the outro left behind.
          key={state.epoch}
          corner={corner}
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
        // Closing to hide the launcher: its opener is leaving, nothing to return to.
        restoreFocus={phase === 'entering' || phase === 'visible'}
      />
      <A11yToast
        phase={state.toast}
        corner={corner}
        autoFocus={state.focusToast}
        onRestore={restore}
        onDismiss={dismissToast}
        onGone={toastGone}
      />
      {prefs.readingGuide && <ReadingGuide />}
    </>
  )
}
