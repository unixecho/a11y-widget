# a11y-widget

Shared, portable accessibility widget (floating launcher + preferences
panel) for unixecho's customer-facing sites. Used today by **AyekaBar** and
**Sarcafe-Portal**; new projects should adopt it from day one rather than
copy-pasting a fork of it.

This is a **user-preference convenience layer, never a compliance
mechanism**. It never stands in for a code-level fix — semantic HTML, real
color contrast, real keyboard support. Each host site's own accessibility
statement is what carries that claim, and it must describe only what that
site has actually verified. This package's job is the bonus layer on top:
font scaling, contrast modes, a reading guide, and so on.

Zero host-app dependencies — no assumed CSS classes, no assumed sheet/modal
component, no assumed design tokens (falls back to a complete built-in dark
palette if the host defines none). Peer dependencies are only `react` and
`react-dom` (18 or 19).

## Install

Add it as a dependency pinned to a release tag. Both consuming apps
(AyekaBar, Sarcafe-Portal) use the tarball URL form, which npm fetches over
plain HTTPS with no git involved:

```json
{
  "dependencies": {
    "a11y-widget": "https://github.com/unixecho/a11y-widget/archive/refs/tags/v1.1.0.tar.gz"
  }
}
```

(`github:unixecho/a11y-widget#v1.1.0` resolves to the same code wherever git
is available.)

Then in `next.config.js`/`next.config.mjs`, tell Next to transpile it (it
ships TypeScript/TSX source, not a pre-built bundle):

```js
const nextConfig = {
  transpilePackages: ['a11y-widget'],
  // ...the rest of your existing config
}
```

To pick up a later version, bump the tag in `package.json` and reinstall
(`npm install`) — which also refreshes `package-lock.json`, so commit both.
There is no publish step and no registry — GitHub is the registry.

## Integration contract

The widget needs exactly one thing from the host's root layout: a wrapper
around the page's own content with `id="a11y-scope"`, and the widget itself
mounted as that wrapper's **sibling**, not its parent or child — both direct
children of `<body>`.

```tsx
// app/layout.tsx
import { A11yWidget } from 'a11y-widget'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <div id="a11y-scope">{children}</div>
        <A11yWidget config={{ storageKey: 'your-app:a11y-prefs' }} />
      </body>
    </html>
  )
}
```

Why the split: contrast/grayscale/invert modes apply a CSS `filter` to
`#a11y-scope` only, never to `<html>`/`<body>`. `filter` on an ancestor
silently makes it a containing block for every `position: fixed`
descendant — the widget's own launcher and panel included — so anything
filtered has to sit outside the widget's own portalled UI, not wrap it.
Font scale applies to `<html>` directly, so your own type scale must be
`rem`-based for it to cascade correctly; verify that before adopting this
in a new codebase.

### Config

```ts
interface A11yWidgetConfig {
  corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' // DEFAULT corner, 'bottom-right' — a visitor can move it, see below
  accentColor?: string       // CSS color; falls back to var(--neon) or a built-in default
  onHaptic?: (pattern: 'tick' | 'select') => void  // inject your own haptics module; never guessed at here
  storageKey?: string        // localStorage key — SEE MIGRATION NOTE BELOW
  defaultLang?: 'he' | 'en' | 'ar'  // seed before <html lang> is observed
  statementHref?: string     // link to the host's own accessibility statement, shown in the panel footer
}
```

An explicit `undefined` for any of these (what you pass when forwarding an
optional value of your own) behaves like leaving it out; an invalid `corner`
falls back to the default.

**Migrating an app off its own earlier copy of this widget?** Pass that
app's *existing* localStorage key as `storageKey`. That is what preserves
visitors' already-saved preferences across the migration instead of
silently resetting them the first time they load the new version.
AyekaBar's key was `ayeka.a11y.prefs.v1`; Sarcafe-Portal's was
`sarcafe:a11y-prefs`.

### Storage

Two `localStorage` keys, both derived from `storageKey`:

| Key | Holds |
|---|---|
| `<storageKey>` | the page adjustments (`A11yPrefs`) — what *Reset settings* clears |
| `<storageKey>:ui` | the widget's own chrome: `{ corner, introSeen }` |

They are separate on purpose. *Reset settings* clears adjustments, and should
not silently drag the button back to another corner; and keeping the `A11yPrefs`
shape untouched means an app still reading the key with an older copy of this
widget keeps working. Upgrading needs no migration — a missing `:ui` key just
means "never chose a corner, intro not yet seen".

## The button itself: hide it, move it, how it arrives

A floating button can sit on top of a host page's own UI — a bottom tab bar, a
cookie banner, a chat bubble — so the visitor is in charge of it. All of this
lives in the panel and needs no host configuration.

- **Hide this button.** A control pinned to the foot of the panel hides the
  launcher. It plays a short outro (drawn back into its corner) and a toast
  appears in the same corner explaining the three ways back: press **F2**, press
  the toast's *Bring it back* button, or just refresh the page. The toast
  stays for 10 seconds, pauses while it is hovered or holds focus, and takes
  keyboard focus when the hide was done from the keyboard.
  - Only the *button* is hidden. Every adjustment the visitor chose (text size,
    contrast, reading guide…) stays applied.
  - **Hiding is deliberately not remembered across reloads.** A hide that
    survived a refresh could lock out a visitor who hid it by accident and
    does need it, and "refresh the page" is the one recovery that needs no
    keyboard and nothing to discover. (Client-side navigation keeps the widget
    mounted, so it also stays hidden while the visitor browses; it returns on
    a real reload.)
  - **F2 keeps working while the button is hidden** — that is what makes it the
    quick way back. It restores the button *and* opens the panel.
- **Button position.** A picker — a miniature screen with a target in each
  corner — moves the button to any of the four corners (arrow keys work too),
  and the button glides there. The choice is saved on the device. `config.corner`
  is only the *default*, for visitors who have not chosen.
- **Intro.** On a visitor's very first visit the button springs in, pulses twice
  and unfolds into a pill showing its name and shortcut, then folds back into a
  circle. Every later load, and every restore, is just the quick spring-in.
- **Reduced motion.** The OS "reduce motion" setting and the widget's own
  *Pause animations* both strip this down: the button simply appears and
  disappears, with no pill and no pulse, and nothing waits on an animation that
  has been switched off.

## What's real, and why the profiles aren't a shortcut around that

Every "quick profile" (`QUICK_PROFILES`, exported from the package) is a
named bundle of the same toggles a visitor could set by hand — nothing is
invented to pad out the list, and no profile claims a capability that
doesn't otherwise exist in the panel. Same for `WIDGET_COVERAGE`: it
describes only what this package itself does. It says nothing about a
host site's own code-level work (semantic structure, an actual
keyboard-only pass, real screen-reader testing) — that stays each site's
own hand-written, verified statement.

## Development

```sh
npm install
npm run check      # pure-logic harness — sanitization, applied-state
                    # determinism, exhaustive class enumeration, trilingual
                    # coverage of every string/profile/coverage item
npm run typecheck
```

There is no build step. Consumers transpile the TypeScript source
themselves via `transpilePackages`; this repo's own `tsc --noEmit` is only
a type-check gate, not a compile step.

## Versioning

Tag releases (`v1.0.0`, `v1.1.0`, ...) and update `CHANGELOG.md`. Consumers
pin an exact tag in `package.json` and upgrade explicitly — there is no
"latest" floating reference, so a change here never silently reaches a
consumer without that consumer choosing to pull it.
