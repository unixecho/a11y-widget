// Portable, host-agnostic domain types for the shared accessibility widget.
// No DOM, no React, no host-app imports — this file works unmodified as a
// git dependency in any React project.
//
// History: extracted 2026-09-24 from AyekaBar's src/lib/a11y (the original
// "Ayeka-only first" build), after Sarcafe-Portal's independently-maintained
// copy of the same widget had already silently drifted from it — same
// A11yPrefs shape, but two different application mechanisms (CSS custom
// properties vs. one-CSS-class-per-step) and two different storage keys.
// This package is the single source of truth going forward; every consumer
// imports it instead of re-implementing it, so a fix or a new toggle lands
// everywhere at once.
//
// GOVERNING PRINCIPLE, carried over unchanged: this widget is a user-
// PREFERENCE convenience layer, never a compliance mechanism. Nothing here
// may stand in for a code-level fix (semantic HTML, real contrast, real
// keyboard support) — each host app's own accessibility statement is what
// carries that claim, and it must describe only what THAT site has actually
// verified.

export type Lang = 'he' | 'en' | 'ar'
export const RTL_LANGS: ReadonlySet<Lang> = new Set<Lang>(['he', 'ar'])

/** 0 = 100% (default) .. 4 = 150%. Applied to the root font-size via a CSS
 *  custom property — cascades correctly in any codebase whose own type
 *  scale is rem-based (verify this holds before adopting in a new host). */
export type FontScaleStep = 0 | 1 | 2 | 3 | 4
/** 0 = normal .. 3 = wide. Drives letter-spacing, word-spacing and
 *  line-height together — see apply.ts for the exact values. */
export type SpacingStep = 0 | 1 | 2 | 3
export type ContrastMode = 'default' | 'high' | 'grayscale' | 'invert'

export interface A11yPrefs {
  fontScale: FontScaleStep
  spacing: SpacingStep
  contrast: ContrastMode
  pauseAnimations: boolean
  readingGuide: boolean
  highlightLinks: boolean
  highlightHeadings: boolean
  bigCursor: boolean
  /** Visually recede photographic <img> content for a visitor who reads
   *  faster/calmer without it competing for attention. Deliberately NOT
   *  `display:none`/`visibility:hidden` — see apply.ts for why: those strip
   *  the element from the accessibility tree, which would take alt text
   *  away from exactly the assistive-tech users this widget exists for. */
  hideImages: boolean
  /** Swaps text to a maximally-legible system font stack with slightly wider
   *  tracking. Real and native — no external font fetch, so it can never
   *  make things worse for a visitor with no network, and never regress a
   *  future host that lacks a webfont this toggle might otherwise assume. */
  readableFont: boolean
}

export const DEFAULT_A11Y_PREFS: A11yPrefs = {
  fontScale: 0,
  spacing: 0,
  contrast: 'default',
  pauseAnimations: false,
  readingGuide: false,
  highlightLinks: false,
  highlightHeadings: false,
  bigCursor: false,
  hideImages: false,
  readableFont: false,
}

export const FONT_SCALE_STEPS: FontScaleStep[] = [0, 1, 2, 3, 4]
export const SPACING_STEPS: SpacingStep[] = [0, 1, 2, 3]
export const CONTRAST_MODES: ContrastMode[] = ['default', 'high', 'grayscale', 'invert']

/** Physical corner only, never logical start/end — fixed chrome must stay in
 *  the same physical corner regardless of text direction, so a value here
 *  must not flip meaning under RTL. */
export type A11yCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/** A one-tap COMPOSITION of the real prefs above — never a capability that
 *  doesn't otherwise exist in this widget. Modelled on the "quick profiles"
 *  pattern of commercial accessibility widgets, but every profile here is
 *  just a named bundle of the same toggles a visitor could set by hand —
 *  nothing is invented to fill out the list. */
export interface QuickProfile {
  id: string
  labels: Record<Lang, string>
  /** Plain-language description of who this is for and what it changes —
   *  shown under the button and read by assistive tech via
   *  aria-describedby, never relied on visually alone. */
  descriptions: Record<Lang, string>
  patch: Partial<A11yPrefs>
}

export const QUICK_PROFILES: QuickProfile[] = [
  {
    id: 'attention',
    labels: { he: 'קשיי קשב וריכוז', en: 'Attention / ADHD', ar: 'صعوبات الانتباه والتركيز' },
    descriptions: {
      he: 'עוצר אנימציות, מדגיש כותרות ומפעיל מדריך קריאה — פחות תזוזה ופחות מסיחים על המסך.',
      en: 'Stops animations, highlights headings and turns on the reading guide — less on-screen motion and fewer distractions.',
      ar: 'يوقف الحركات، يبرز العناوين ويفعّل دليل القراءة — حركة أقل وتشتيت أقل على الشاشة.',
    },
    patch: { pauseAnimations: true, highlightHeadings: true, readingGuide: true },
  },
  {
    id: 'low-vision',
    labels: { he: 'לקויי ראייה', en: 'Low vision', ar: 'ضعف البصر' },
    descriptions: {
      he: 'טקסט גדול משמעותית, ניגודיות גבוהה וסמן עכבר גדול.',
      en: 'Significantly larger text, high contrast and a big cursor.',
      ar: 'نص أكبر بكثير، تباين عالٍ ومؤشر فأرة كبير.',
    },
    patch: { fontScale: 3, contrast: 'high', bigCursor: true },
  },
  {
    id: 'seizure-safe',
    labels: { he: 'רגישות לתנועה והבהוב', en: 'Seizure-safe', ar: 'الحماية من النوبات' },
    descriptions: {
      he: 'עוצר כל אנימציה ומעבר תנועה באתר, מעבר להגדרת המערכת.',
      en: 'Stops every animation and transition on the site, beyond the OS-level setting.',
      ar: 'يوقف كل الرسوم المتحركة والانتقالات في الموقع، بالإضافة إلى إعداد النظام.',
    },
    patch: { pauseAnimations: true },
  },
  {
    id: 'senior',
    labels: { he: 'גיל הזהב', en: 'Senior-friendly', ar: 'كبار السن' },
    descriptions: {
      he: 'טקסט וריווח מוגדלים, ניגודיות גבוהה וקישורים מודגשים בקו תחתי.',
      en: 'Bigger text and spacing, high contrast and underlined links.',
      ar: 'نص وتباعد أكبر، تباين عالٍ وروابط مسطّرة.',
    },
    patch: { fontScale: 2, spacing: 1, contrast: 'high', highlightLinks: true },
  },
  {
    id: 'dyslexia',
    labels: { he: 'קשיי קריאה', en: 'Reading difficulty / dyslexia', ar: 'صعوبات القراءة' },
    descriptions: {
      he: 'גופן קריא במיוחד, ריווח מוגדל ומדריך קריאה שעוקב אחר המצביע.',
      en: 'An especially legible font, wider spacing and the pointer-following reading guide.',
      ar: 'خط سهل القراءة بشكل خاص، تباعد أوسع ودليل قراءة يتتبع المؤشر.',
    },
    patch: { readableFont: true, spacing: 2, readingGuide: true },
  },
]

export interface A11yWidgetConfig {
  /** Physical corner for the launcher button. Default 'bottom-right'. */
  corner?: A11yCorner
  /** CSS color (any valid value) for the launcher/panel accent. Falls back
   *  to `var(--neon)` if the host defines it, else a neutral built-in
   *  default — see internal/style.ts. */
  accentColor?: string
  /** Injected, never re-implemented: a host that has its own haptics module
   *  passes it here rather than this package guessing at platform tricks it
   *  cannot verify (iOS's fake-checkbox haptic trick is exactly the kind of
   *  thing that must live in ONE place, not be re-derived per package). */
  onHaptic?: (pattern: 'tick' | 'select') => void
  /** localStorage key. Pass the host's EXISTING key when migrating an app
   *  that already has this widget under a different implementation — that
   *  is what preserves visitors' already-saved preferences across the
   *  migration instead of silently resetting them. Defaults to a
   *  package-namespaced key for a brand-new install. */
  storageKey?: string
  /** Seed language before the DOM's own `<html lang>` is observed — avoids a
   *  flash of the wrong language on a host whose default isn't Hebrew. */
  defaultLang?: Lang
}

export const DEFAULT_A11Y_CONFIG: Required<Pick<A11yWidgetConfig, 'corner' | 'storageKey' | 'defaultLang'>> = {
  corner: 'bottom-right',
  storageKey: 'a11y-widget:prefs:v1',
  defaultLang: 'he',
}
