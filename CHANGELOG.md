# Changelog

## Unreleased

- **Hide the button, and a quick way back.** A "Hide this button" control,
  pinned to the foot of the panel, hides the launcher. It plays an outro, then
  a toast in the same corner shows how to bring it back: **F2**, the toast's
  *Bring it back* button, or a page refresh. F2 keeps working while the button
  is hidden and restores it and opens the panel. Adjustments the visitor already
  chose stay applied. Hiding is **not persisted** — a reload always restores
  the button, so nobody is locked out of the tool.
- **Visitor-chosen corner.** A picker in the panel moves the button to any of
  the four corners (arrow keys work); the button glides there and the choice is
  saved on the device. `config.corner` is now only the *default*.
- **Intro.** First visit: spring-in, two pulses, and a label pill with the name
  and shortcut. Every later load and every restore: a quick spring-in. Both are
  skipped down to "just appears" under the OS reduced-motion setting and under
  the widget's own *Pause animations*.
- **Toast** (`A11yToast`, also exported) — a persistent `aria-live` region with
  the toast inserted into it; pauses on hover and focus (WCAG 2.2.1); never
  dismisses on a CSS animation event, so "Pause animations" cannot make it vanish
  early; hands focus to its button when the hide came from the panel.
- **New storage key `<storageKey>:ui`** holding `{ corner, introSeen }`. Separate
  from the prefs key, so `A11yPrefs` is unchanged and *Reset settings* does not
  move the button. No migration needed.
- **Fix: an explicit `undefined` in `config` no longer overrides a default.**
  `{ ...defaults, ...config }` copied `corner: undefined` over the default;
  `resolveA11yConfig` (exported) now resolves the three defaulted fields with
  `??`, and an invalid `corner` falls back to the default.
- `WIDGET_COVERAGE` gains two items (`launcher-position`, `hide-launcher`).
  A host that renders it on its statement page will list them automatically
  after upgrading — worth a read-through of that page.
- `A11yLauncher` gains optional `phase`, `intro` and `autoFocus` props, and
  `A11yPanel` optional `onHide` and `restoreFocus`; omitting them keeps the
  old, static behaviour for anyone composing the pieces by hand. `A11ySheet`
  gains `restoreFocus` (default `true`).
- Provider context gains `corner`, `setCorner`, `introSeen`, `markIntroSeen`.

- **`config.statementHref`** — an optional link in the panel footer to the
  host's own accessibility statement page. Matches a feature
  Sarcafe-Portal's pre-migration widget already had that AyekaBar's didn't;
  omitted entirely when not configured rather than guessing at a route.

## 1.0.0 — 2026-09-24

Initial release. Extracted from AyekaBar's in-house accessibility widget
(`src/lib/a11y` + `src/components/a11y`) after Sarcafe-Portal's independently
maintained copy of the same widget had already drifted from it — same
`A11yPrefs` shape, two different application mechanisms and storage keys.
This package becomes the single source of truth for both.

Ported as-is:
- Font scale (0–150%), text/word spacing, line-height.
- Three contrast modes: high contrast, grayscale, invert.
- Pause animations, pointer-follow reading guide, highlight links/headings,
  big cursor.
- Trilingual panel (he/en/ar), RTL-correct.
- Real focus trap + focus restore on the panel, physical (never logical)
  launcher corner, containing-block-safe portalling.

New in this release:
- **Quick profiles** — one-tap compositions of the existing real toggles
  (attention/ADHD, low vision, seizure-safe, senior, reading difficulty).
  Every profile is a bundle of prefs a visitor could already set by hand;
  nothing new is invented to fill out the list.
- **Recede images** (`hideImages`) — visually de-emphasizes `<img>` content
  via opacity, never `display:none`/`visibility:hidden`, so alt text stays
  in the accessibility tree for assistive-tech users.
- **Readable font** (`readableFont`) — swaps to a maximally-legible native
  font stack, no external font fetch.
- **Read selected text aloud** — uses the browser's native Web Speech API
  to read back whatever text a visitor has selected. Feature-detected: an
  unsupported browser sees no button, never a broken one. Deliberately
  scoped to a selection, never "read the whole page" — see A11yPanel.tsx's
  own comment for why.
- **F2 opens/closes the panel** (Escape already closed it) — matches the
  shortcut convention of commercial accessibility widgets.
- Self-contained sheet/portal/switch primitives — this package now has
  ZERO host-app imports, unlike the two original in-repo builds it replaces
  (which each depended on their own app's cart/sheet system).
- `WIDGET_COVERAGE` — canonical, trilingual description of what the widget
  itself does, meant to be rendered on each host's own accessibility
  statement page instead of hand-copied prose.
