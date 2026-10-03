'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_A11Y_PREFS, DEFAULT_A11Y_UI, RTL_LANGS, resolveA11yConfig,
  type A11yCorner, type A11yPrefs, type A11yUiState, type A11yWidgetConfig, type Lang, type ResolvedA11yConfig,
} from './types'
import { a11yUiStorageKey, loadA11yPrefs, loadA11yUi, saveA11yPrefs, saveA11yUi } from './storage'
import { computeAppliedState, ALL_A11Y_HTML_CLASSES } from './apply'
import { injectA11yStyles } from './internal/style'

// The widget's state + the one place it ever touches the DOM outside its own
// portalled UI. This effect only ever writes className/style/CSS custom
// properties — it has no code path that calls .focus() on anything, so
// applying a preference never moves focus.

interface A11yContextValue {
  prefs: A11yPrefs
  ready: boolean
  set: <K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => void
  patch: (partial: Partial<A11yPrefs>) => void
  reset: () => void
  /** The corner the launcher actually sits in: the visitor's own choice if
   *  they have made one, else the host's `config.corner`. */
  corner: A11yCorner
  setCorner: (corner: A11yCorner) => void
  /** Whether the full first-visit intro has already played on this device. */
  introSeen: boolean
  markIntroSeen: () => void
  lang: Lang
  dir: 'rtl' | 'ltr'
  config: ResolvedA11yConfig
}

const A11yContext = createContext<A11yContextValue | null>(null)

export function useA11y(): A11yContextValue {
  const ctx = useContext(A11yContext)
  if (!ctx) throw new Error('useA11y must be used inside <A11yProvider>')
  return ctx
}

export default function A11yProvider({ children, config = {} }: { children: ReactNode; config?: A11yWidgetConfig }) {
  const resolvedConfig = useMemo(() => resolveA11yConfig(config), [config])
  const [prefs, setPrefsState] = useState<A11yPrefs>(DEFAULT_A11Y_PREFS)
  const [ui, setUi] = useState<A11yUiState>(DEFAULT_A11Y_UI)
  const [ready, setReady] = useState(false)
  const [lang, setLang] = useState<Lang>(resolvedConfig.defaultLang)
  const uiKey = a11yUiStorageKey(resolvedConfig.storageKey)

  useEffect(() => { injectA11yStyles() }, [])

  // Client-only load — rendering a preference that then jumps on first paint
  // is worse than rendering the default for one frame. The widget-UI state
  // (corner, intro seen) loads in the same batch as the prefs, so `ready`
  // means both are hydrated and the launcher can never appear in the default
  // corner for a frame before jumping to the visitor's own.
  useEffect(() => {
    setPrefsState(loadA11yPrefs(resolvedConfig.storageKey))
    setUi(loadA11yUi(a11yUiStorageKey(resolvedConfig.storageKey)))
    setReady(true)
    // Only ever re-run if the storage key itself changes (it shouldn't,
    // mid-session) — loading is a one-time hydration step, not a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedConfig.storageKey])

  useEffect(() => {
    if (ready) saveA11yPrefs(resolvedConfig.storageKey, prefs)
  }, [prefs, ready, resolvedConfig.storageKey])

  useEffect(() => {
    if (ready) saveA11yUi(uiKey, ui)
  }, [ui, ready, uiKey])

  // Track <html lang>. No app-wide language context is assumed to exist —
  // every host may manage its own `lang` state independently — so this
  // watches the DOM directly via MutationObserver, which every host already
  // keeps in sync on every language change.
  useEffect(() => {
    const read = () => {
      const l = document.documentElement.lang
      if (l === 'he' || l === 'en' || l === 'ar') setLang(l)
    }
    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    return () => obs.disconnect()
  }, [])

  const dir: 'rtl' | 'ltr' = RTL_LANGS.has(lang) ? 'rtl' : 'ltr'

  // Apply to the DOM. Diffed against the full known class list so a class
  // that is no longer wanted is actually removed, not merely never re-added.
  useEffect(() => {
    const html = document.documentElement
    const { rootVars, rootClasses, scopeFilter } = computeAppliedState(prefs)
    Object.entries(rootVars).forEach(([k, v]) => html.style.setProperty(k, v))
    if (resolvedConfig.accentColor) html.style.setProperty('--a11y-accent', resolvedConfig.accentColor)
    html.classList.remove(...ALL_A11Y_HTML_CLASSES)
    if (rootClasses.length) html.classList.add(...rootClasses)
    // #a11y-scope wraps the host's page content — see the README's
    // integration contract. Filter is scoped there and never applied to
    // <html>/<body> — see apply.ts's header for the containing-block reasoning.
    const scope = document.getElementById('a11y-scope')
    if (scope) scope.style.filter = scopeFilter === 'none' ? '' : scopeFilter
  }, [prefs, resolvedConfig.accentColor])

  const set = useCallback(<K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => {
    setPrefsState((prev) => ({ ...prev, [key]: value }))
  }, [])
  const patch = useCallback((partial: Partial<A11yPrefs>) => {
    setPrefsState((prev) => ({ ...prev, ...partial }))
  }, [])
  // `reset` clears the page adjustments only. Where the visitor parked the
  // button is a separate, deliberate choice about the widget's own chrome —
  // "Reset settings" should not silently drag it back to another corner.
  const reset = useCallback(() => setPrefsState({ ...DEFAULT_A11Y_PREFS }), [])

  const setCorner = useCallback((c: A11yCorner) => {
    setUi((prev) => (prev.corner === c ? prev : { ...prev, corner: c }))
  }, [])
  const markIntroSeen = useCallback(() => {
    setUi((prev) => (prev.introSeen ? prev : { ...prev, introSeen: true }))
  }, [])
  const corner = ui.corner ?? resolvedConfig.corner

  const value = useMemo(
    () => ({
      prefs, ready, set, patch, reset, corner, setCorner,
      introSeen: ui.introSeen, markIntroSeen, lang, dir, config: resolvedConfig,
    }),
    [prefs, ready, set, patch, reset, corner, setCorner, ui.introSeen, markIntroSeen, lang, dir, resolvedConfig],
  )

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>
}
