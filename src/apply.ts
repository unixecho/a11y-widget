import type { A11yPrefs } from './types'

/** What A11yProvider actually writes to the DOM for a given set of prefs.
 *  PURE — no DOM access here, so it is unit-testable by scripts/check-a11y.mjs
 *  the same way a reducer would be. The provider diffs this against the live
 *  root element and scope wrapper and writes only what changed. */
export interface AppliedA11yState {
  /** CSS custom properties written to the root element. */
  rootVars: Record<string, string>
  /** Classes written to the root element — properties that do NOT create a
   *  CSS containing block (animation-duration, cursor, font-family,
   *  outline, text-decoration) so they are safe directly on the root and
   *  apply to portalled content too (see `scopeFilter` below for the one
   *  that is NOT safe there). */
  rootClasses: string[]
  /** `filter` value for the scope element ONLY, never the root/body.
   *
   *  WHY: `transform` on an ancestor silently makes it a CSS containing
   *  block for every descendant `position: fixed` element, and `filter`
   *  triggers the identical behaviour for the identical reason (same
   *  containing-block trigger list). Applying `filter: grayscale(1)` to the
   *  root would silently relocate every fixed/portalled control on the site
   *  — including this widget's own launcher. Scoping the filter to a
   *  wrapper around the page's own content (outside this widget's portalled
   *  UI) avoids that entirely. */
  scopeFilter: string
}

const FONT_SCALE_PCT = ['100%', '112.5%', '125%', '137.5%', '150%']
const LETTER_SPACING = ['normal', '0.04em', '0.08em', '0.12em']
const WORD_SPACING = ['normal', '0.12em', '0.2em', '0.3em']
/** Deliberately WITHOUT !important at the point of use (internal/style.ts)
 *  — forcing line-height everywhere collides with components that set a
 *  precise inline `lineHeight` for tight icon+text alignment. Applied only
 *  where nothing more specific already claimed it: an honest partial fix,
 *  not a silent no-op. */
const LINE_HEIGHT = ['normal', '1.6', '1.8', '2.15']

export function computeAppliedState(prefs: A11yPrefs): AppliedA11yState {
  // Non-null assertions below are sound by construction, not a shortcut:
  // FontScaleStep/SpacingStep are closed unions (0..4 / 0..3) whose every
  // member has a matching array slot, so a some-consumer-tsconfig's
  // `noUncheckedIndexedAccess` sees `T | undefined` where the actual domain
  // guarantees `T`.
  const rootVars: Record<string, string> = {
    '--a11y-font-scale': FONT_SCALE_PCT[prefs.fontScale]!,
    '--a11y-letter-spacing': LETTER_SPACING[prefs.spacing]!,
    '--a11y-word-spacing': WORD_SPACING[prefs.spacing]!,
    '--a11y-line-height': LINE_HEIGHT[prefs.spacing]!,
  }

  const rootClasses: string[] = []
  if (prefs.pauseAnimations) rootClasses.push('a11y-motion-off')
  if (prefs.highlightLinks) rootClasses.push('a11y-highlight-links')
  if (prefs.highlightHeadings) rootClasses.push('a11y-highlight-headings')
  if (prefs.bigCursor) rootClasses.push('a11y-big-cursor')
  if (prefs.hideImages) rootClasses.push('a11y-hide-images')
  if (prefs.readableFont) rootClasses.push('a11y-readable-font')

  const scopeFilter =
    prefs.contrast === 'high' ? 'contrast(1.35) saturate(1.15)'
    : prefs.contrast === 'grayscale' ? 'grayscale(1)'
    : prefs.contrast === 'invert' ? 'invert(1) hue-rotate(180deg)'
    : 'none'

  return { rootVars, rootClasses, scopeFilter }
}

/** Every class computeAppliedState can ever produce — so the provider can
 *  remove a class that is no longer wanted without tracking previous state
 *  itself (`classList.remove(...ALL_A11Y_HTML_CLASSES); classList.add(...next)`).
 *  Kept here, next to the one function that emits them, so the two cannot
 *  drift apart. */
export const ALL_A11Y_HTML_CLASSES = [
  'a11y-motion-off', 'a11y-highlight-links', 'a11y-highlight-headings',
  'a11y-big-cursor', 'a11y-hide-images', 'a11y-readable-font',
]
