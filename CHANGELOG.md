# Changelog

## 1.1.1 — 2026-10-03

A fix to the 1.1.0 toast, found by the first real visitor to use it on a phone.

- **Fix: the toast never closed by itself.** Hiding the button from the panel
  moved keyboard focus onto the toast's *Bring it back* button by script — after
  a **tap** — and the toast treated *any* focus as "the visitor is reading me,
  hold the clock". So on a phone the 10-second timer (and its progress line)
  froze on frame zero and the toast stayed until the visitor pressed X. The
  README had always said the toast takes focus "when the hide was done from the
  keyboard"; the code took it for every hide from inside the panel.
  - The clock is now held only by genuine engagement (`toastHeld`, exported from
    `lifecycle.ts`, pure and tested): a **mouse** over the toast, a pointer
    **pressed and held** on it (touch-and-hold keeps it open, like a story), or
    **keyboard** focus inside it (`:focus-visible`). Touch "hover" — which never
    ends — and focus the page moved there itself no longer count. WCAG 2.2.1
    (Timing Adjustable) is kept for the visitors it is for.
  - Hiding from the panel hands the toast focus **only to a keyboard visitor**
    (`isKeyboardFocus`, new in `internal/focus.ts`). A tap or click does not.
- **The toast closes itself after 5 seconds** (was 10; `TOAST_VISIBLE_MS`). The
  harness holds it between 5s and 6s.
- **A countdown ring on the close button** replaces the 3px line along the
  bottom edge, which nobody noticed: it drains over the toast's life, the way a
  navigation app's prompts do, and freezes with the clock. Hidden — with the JS
  clock still running — under reduced motion and "Pause animations".
  (`.a11yw-toast-timer` is gone; hosts targeting it should use
  `.a11yw-toast-ring-fill`.)
- 16 new harness checks (120 total), including that the two original defects
  — focus after any panel interaction, touch counted as hover — fail the
  harness when reintroduced.

## 1.1.0 — 2026-10-03

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
