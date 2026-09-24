// Public API. Import this package's components/types/data through here —
// deep imports into src/internal/* are not part of the contract and may
// change shape between minor versions.

export { default as A11yWidget } from './A11yWidget'
export { default as A11yProvider, useA11y } from './A11yProvider'
export { default as A11yLauncher } from './A11yLauncher'
export { default as A11yPanel } from './A11yPanel'
export { default as ReadingGuide } from './ReadingGuide'

export {
  DEFAULT_A11Y_PREFS,
  DEFAULT_A11Y_CONFIG,
  FONT_SCALE_STEPS,
  SPACING_STEPS,
  CONTRAST_MODES,
  QUICK_PROFILES,
  RTL_LANGS,
} from './types'
export type {
  Lang,
  A11yPrefs,
  FontScaleStep,
  SpacingStep,
  ContrastMode,
  A11yCorner,
  A11yWidgetConfig,
  QuickProfile,
} from './types'

export { computeAppliedState, ALL_A11Y_HTML_CLASSES } from './apply'
export type { AppliedA11yState } from './apply'

export { sanitizeA11yPrefs, loadA11yPrefs, saveA11yPrefs } from './storage'

export { A11Y_UI, a11yT } from './i18n'
export type { A11yUiKey } from './i18n'

export { WIDGET_COVERAGE } from './coverage'
export type { CoverageItem } from './coverage'
