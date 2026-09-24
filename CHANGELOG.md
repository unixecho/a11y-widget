# Changelog

## Unreleased

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
