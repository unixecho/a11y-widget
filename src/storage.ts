import {
  DEFAULT_A11Y_PREFS, DEFAULT_A11Y_UI, FONT_SCALE_STEPS, SPACING_STEPS, CONTRAST_MODES, isA11yCorner,
  type A11yPrefs, type A11yUiState, type FontScaleStep, type SpacingStep, type ContrastMode,
} from './types'

/** Never throws, never trusts the input: every field is type- and
 *  range-checked independently, and an unrecognised value falls back to the
 *  default for THAT field rather than discarding the whole object — so one
 *  corrupted key doesn't cost every other preference the visitor set. */
export function sanitizeA11yPrefs(raw: unknown): A11yPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_A11Y_PREFS }
  const r = raw as Record<string, unknown>
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
  return {
    fontScale: FONT_SCALE_STEPS.includes(r.fontScale as FontScaleStep)
      ? (r.fontScale as FontScaleStep) : DEFAULT_A11Y_PREFS.fontScale,
    spacing: SPACING_STEPS.includes(r.spacing as SpacingStep)
      ? (r.spacing as SpacingStep) : DEFAULT_A11Y_PREFS.spacing,
    contrast: CONTRAST_MODES.includes(r.contrast as ContrastMode)
      ? (r.contrast as ContrastMode) : DEFAULT_A11Y_PREFS.contrast,
    pauseAnimations: bool(r.pauseAnimations, DEFAULT_A11Y_PREFS.pauseAnimations),
    readingGuide: bool(r.readingGuide, DEFAULT_A11Y_PREFS.readingGuide),
    highlightLinks: bool(r.highlightLinks, DEFAULT_A11Y_PREFS.highlightLinks),
    highlightHeadings: bool(r.highlightHeadings, DEFAULT_A11Y_PREFS.highlightHeadings),
    bigCursor: bool(r.bigCursor, DEFAULT_A11Y_PREFS.bigCursor),
    hideImages: bool(r.hideImages, DEFAULT_A11Y_PREFS.hideImages),
    readableFont: bool(r.readableFont, DEFAULT_A11Y_PREFS.readableFont),
  }
}

/** `key` is caller-supplied (A11yWidgetConfig.storageKey) rather than a
 *  constant here — a host migrating onto this package from its own earlier
 *  copy of the widget passes its EXISTING key so visitors' already-saved
 *  preferences survive the migration instead of silently resetting. No
 *  TTL, deliberately: a font-scale or high-contrast choice is closer to an
 *  OS accessibility setting than an abandoned shopping cart and should not
 *  silently expire. */
export function loadA11yPrefs(key: string): A11yPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_A11Y_PREFS }
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { ...DEFAULT_A11Y_PREFS }
    return sanitizeA11yPrefs(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_A11Y_PREFS }
  }
}

export function saveA11yPrefs(key: string, prefs: A11yPrefs): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(prefs))
  } catch {
    // Private browsing / storage full: the preference just doesn't survive
    // a reload. Not fatal — the widget still works for the rest of the visit.
  }
}

// ── widget-UI state (corner choice, intro seen) ────────────────────────────
//
// Same discipline as the prefs above — never throws, never trusts the input —
// but a separate blob under a separate key. The prefs key is the host's
// (possibly legacy, migrated-from) one; the UI blob is derived from it so it
// follows the host's namespace without ever colliding with the prefs value.

export function a11yUiStorageKey(prefsKey: string): string {
  return `${prefsKey}:ui`
}

export function sanitizeA11yUi(raw: unknown): A11yUiState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_A11Y_UI }
  const r = raw as Record<string, unknown>
  return {
    corner: isA11yCorner(r.corner) ? r.corner : DEFAULT_A11Y_UI.corner,
    introSeen: typeof r.introSeen === 'boolean' ? r.introSeen : DEFAULT_A11Y_UI.introSeen,
  }
}

export function loadA11yUi(key: string): A11yUiState {
  if (typeof window === 'undefined') return { ...DEFAULT_A11Y_UI }
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { ...DEFAULT_A11Y_UI }
    return sanitizeA11yUi(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_A11Y_UI }
  }
}

export function saveA11yUi(key: string, ui: A11yUiState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(ui))
  } catch {
    // Same as the prefs: not fatal. Worst case the launcher returns to its
    // default corner and the intro plays once more on the next visit.
  }
}
