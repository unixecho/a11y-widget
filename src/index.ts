// Public API. Import this package's components/types/data through here —
// deep imports into src/internal/* are not part of the contract and may
// change shape between minor versions.

export { default as A11yWidget } from './A11yWidget'
export { default as A11yProvider, useA11y } from './A11yProvider'
export { default as A11yLauncher } from './A11yLauncher'
export { default as A11yPanel } from './A11yPanel'
export { default as A11yToast } from './A11yToast'
export { default as A11yDisableNotice } from './A11yDisableNotice'
export { default as A11yReEnable } from './A11yReEnable'
export { default as ReadingGuide } from './ReadingGuide'

export {
  DEFAULT_A11Y_PREFS,
  DEFAULT_A11Y_CONFIG,
  DEFAULT_A11Y_UI,
  DEFAULT_LOCALE_SELECTORS,
  FONT_SCALE_STEPS,
  SPACING_STEPS,
  CONTRAST_MODES,
  QUICK_PROFILES,
  RTL_LANGS,
  A11Y_CORNERS,
  A11Y_SHORTCUT_KEY,
  isA11yCorner,
  resolveA11yConfig,
} from './types'
export type {
  Lang,
  A11yPrefs,
  A11yUiState,
  ResolvedA11yConfig,
  FontScaleStep,
  SpacingStep,
  ContrastMode,
  A11yCorner,
  A11yWidgetConfig,
  QuickProfile,
} from './types'
export type { A11yLauncherProps } from './A11yLauncher'
export type { A11yToastProps } from './A11yToast'
export type { A11yDisableNoticeProps } from './A11yDisableNotice'
export type { A11yReEnableProps } from './A11yReEnable'

export { useAvoidingCorner, AVOID_ATTRIBUTE } from './internal/avoid'
export { pickCorner, cornerBox, candidateCorners } from './placement'
export type { Box } from './placement'

export { computeAppliedState, ALL_A11Y_HTML_CLASSES } from './apply'
export type { AppliedA11yState } from './apply'

export {
  sanitizeA11yPrefs, loadA11yPrefs, saveA11yPrefs,
  a11yUiStorageKey, sanitizeA11yUi, loadA11yUi, saveA11yUi,
} from './storage'

export { A11Y_UI, a11yT } from './i18n'
export type { A11yUiKey } from './i18n'

export { WIDGET_COVERAGE } from './coverage'
export type { CoverageItem } from './coverage'
