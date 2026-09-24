// Runtime CSS injection — deliberately NOT a `.css` file imported via
// `import './x.css'`. A git-dependency package consumed through Next's
// `transpilePackages` cannot safely assume every host's bundler will accept
// a global CSS import reaching into node_modules (this has been a recurring
// Next.js/webpack footgun across versions), and a plain <style> tag has
// zero build-tool dependency: it works identically in AyekaBar (Next 14),
// Sarcafe-Portal (Next 15) and any future host, App Router or not.
//
// Every color is a CSS custom property with a layered fallback —
// `var(--a11y-accent, var(--neon, #ff5e3a))` — so a host that already
// defines --neon/--bg-elev-2/--text/etc. (both current consumers do) gets a
// pixel-identical look to before, while a brand-new future host with none
// of those tokens still gets a complete, good-looking dark panel out of the
// box rather than an unstyled one.

let injected = false

export function injectA11yStyles(): void {
  if (typeof document === 'undefined' || injected) return
  if (document.getElementById('a11y-widget-styles')) { injected = true; return }
  const style = document.createElement('style')
  style.id = 'a11y-widget-styles'
  style.textContent = CSS
  document.head.appendChild(style)
  injected = true
}

const CSS = /* css */ `
/* ============================================================
   Shared accessibility widget — self-contained styles.
   Reads the host's own design tokens where present (--neon, --bg-elev-2,
   --text, --line-strong, --ease), falls back to a neutral dark palette
   where absent. Never assumes any host CSS class exists.
   ============================================================ */

/* ---- The launcher ----
   ≥44px tap target (WCAG 2.2 2.5.8). Physical corners only — fixed chrome
   stays in the same physical corner regardless of text direction. */
.a11y-fab {
  position: fixed;
  z-index: 2147483000;
  width: 48px; height: 48px;
  display: grid; place-items: center;
  border: 0; border-radius: 999px;
  background: linear-gradient(135deg, var(--a11y-accent, var(--neon, #ff5e3a)), var(--a11y-accent-soft, var(--neon-soft, #ff8a5c)));
  /* WCAG 1.4.3: white on this gradient computes under 4.5:1 in places —
     verified against both fallback and typical host colors before choosing
     a background this dark. */
  color: var(--a11y-bg, var(--bg, #0b0b12));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 0 24px rgba(255, 94, 58, 0.35);
  cursor: pointer;
  transition: transform .12s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1)), filter .12s ease;
}
.a11y-fab:active { transform: scale(.96); filter: brightness(1.18); }
.a11y-fab-tl { left: 16px;  top: calc(env(safe-area-inset-top) + 16px); }
.a11y-fab-tr { right: 16px; top: calc(env(safe-area-inset-top) + 16px); }
.a11y-fab-bl { left: 16px;  bottom: calc(env(safe-area-inset-bottom) + 16px); }
.a11y-fab-br { right: 16px; bottom: calc(env(safe-area-inset-bottom) + 16px); }

/* ---- The sheet (self-contained — never assumes a host sheet system) ---- */
.a11yw-scrim {
  position: fixed; inset: 0; z-index: 2147483000;
  background: var(--a11y-scrim, rgba(0,0,0,0.55));
  backdrop-filter: blur(6px);
  display: flex; align-items: flex-end; justify-content: center;
  animation: a11yw-fade-in .22s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1));
}
.a11yw-panel {
  width: 100%; max-width: 480px;
  background: var(--a11y-bg-elev, var(--bg-elev-2, #1d1d2b));
  color: var(--a11y-text, var(--text, #f5f3ef));
  border: 1px solid var(--a11y-line-strong, var(--line-strong, rgba(245,243,239,0.14)));
  border-bottom: none;
  border-top-left-radius: 22px; border-top-right-radius: 22px;
  padding: 14px 16px calc(env(safe-area-inset-bottom) + 16px);
  max-height: 88dvh; display: flex; flex-direction: column;
  animation: a11yw-sheet-up .34s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1));
  font-family: inherit;
}
.a11yw-grabber {
  width: 38px; height: 4px; border-radius: 999px;
  background: var(--a11y-line-strong, var(--line-strong, rgba(245,243,239,0.14)));
  margin: 0 auto 14px; flex: 0 0 auto;
}
.a11yw-scroll {
  overflow-y: auto; min-height: 0; display: flex; flex-direction: column;
  gap: 8px; padding-bottom: 4px; -webkit-overflow-scrolling: touch;
}
@media (min-width: 720px) {
  .a11yw-scrim { align-items: center; padding: 24px; }
  .a11yw-panel {
    max-width: 640px; border-radius: 22px; border-bottom: 1px solid var(--a11y-line-strong, var(--line-strong, rgba(245,243,239,0.14)));
    padding: 16px 20px 20px; max-height: min(84dvh, 800px);
  }
  .a11yw-grabber { display: none; }
}
@keyframes a11yw-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes a11yw-sheet-up { from { transform: translateY(100%) } to { transform: none } }

/* ---- Buttons, steppers, switches, choice pills ---- */
.a11yw-press { transition: transform .12s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1)), filter .12s ease; cursor: pointer; }
.a11yw-press:active { transform: scale(.96); filter: brightness(1.18); }

.a11yw-btn-primary, .a11yw-btn-secondary {
  padding: 13px 0; border-radius: 14px; font-size: 0.95rem; font-family: inherit; cursor: pointer;
}
.a11yw-btn-primary {
  border: 1px solid transparent; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, rgba(255,94,58,0.9), rgba(255,138,92,0.75));
}
.a11yw-btn-secondary {
  border: 1px solid var(--a11y-line-strong, var(--line-strong, rgba(245,243,239,0.14)));
  background: var(--a11y-bg-elev, var(--bg-elev-2, #1d1d2b));
  color: var(--a11y-text, var(--text, #f5f3ef));
  font-weight: 700;
}

.a11yw-choice {
  padding: 10px 8px; border-radius: 12px;
  border: 1px solid var(--a11y-line-strong, var(--line-strong, rgba(245,243,239,0.14)));
  background: var(--a11y-bg-elev, var(--bg-elev-2, #1d1d2b));
  color: var(--a11y-text, var(--text, #f5f3ef));
  font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer;
}
.a11yw-choice[aria-checked='true'], .a11yw-choice[data-active='true'] {
  border-color: var(--a11y-accent, var(--neon, #ff5e3a));
  background: rgba(255,94,58,0.12);
  box-shadow: 0 0 18px rgba(255,94,58,0.16);
}

.a11yw-step {
  display: inline-flex; align-items: center; direction: ltr;
  border-radius: 999px; overflow: hidden; min-height: 44px;
  background: linear-gradient(135deg, var(--a11y-accent, var(--neon, #ff5e3a)), var(--a11y-accent-soft, var(--neon-soft, #ff8a5c)));
  box-shadow: 0 0 16px rgba(255, 94, 58, 0.34);
}
.a11yw-step-btn {
  width: 44px; height: 44px; border: 0; background: transparent;
  color: #fff; font: inherit; font-size: 1.25rem; font-weight: 700; line-height: 1;
  cursor: pointer; display: grid; place-items: center;
  transition: background .16s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1));
}
.a11yw-step-btn:active { background: rgba(0, 0, 0, 0.18); }
.a11yw-step-btn:disabled { opacity: 0.45; cursor: default; }
.a11yw-step-qty { min-width: 22px; text-align: center; color: #fff; font-weight: 800; font-size: 0.95rem; font-variant-numeric: tabular-nums; }

.a11y-switch-track {
  position: relative; width: 42px; height: 24px; border-radius: 999px;
  background: var(--a11y-line-strong, var(--line-strong, rgba(245,243,239,0.14)));
  transition: background .25s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1));
  flex: 0 0 auto;
}
.a11y-switch-track[data-on='true'] { background: var(--a11y-accent, var(--neon, #ff5e3a)); }
.a11y-switch-thumb {
  position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  transition: transform .25s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1));
}
/* Physical LTR geometry regardless of page direction — deliberately no
   [dir='rtl'] override. A pill that visually flips per-language reads as
   broken, not as adapting (same reasoning fixed-corner chrome uses). */
.a11y-switch-track[data-on='true'] .a11y-switch-thumb { transform: translateX(18px); }

/* ---- Global effect classes, written to the root element by A11yProvider ----
   None of these use filter/transform — see apply.ts's header for why that
   distinction matters (containing-block hazard for every position:fixed
   element on the site). */

/* Font scale: this codebase's own type scale must be rem-based for this to
   cascade correctly (verify before adopting in a new host — both current
   consumers were checked before this mechanism was chosen). Requires the
   widget to be mounted at the true document root (RootLayout's <html>),
   which is the documented, required integration point — see the README. */
html { font-size: var(--a11y-font-scale, 100%); }
body {
  letter-spacing: var(--a11y-letter-spacing, normal);
  word-spacing: var(--a11y-word-spacing, normal);
}
/* Line-height: DELIBERATELY not !important — many components set a precise
   inline lineHeight for tight icon+text alignment, and forcing it
   everywhere would break those. This only reaches plain text that never
   had its own line-height set — an honest partial fix, not a silent no-op. */
body { line-height: var(--a11y-line-height, normal); }

html.a11y-motion-off *,
html.a11y-motion-off *::before,
html.a11y-motion-off *::after {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
  scroll-behavior: auto !important;
}

html.a11y-highlight-links a,
html.a11y-highlight-links a:visited {
  text-decoration: underline !important;
  text-decoration-thickness: 2px !important;
  text-underline-offset: 2px !important;
}

html.a11y-highlight-headings h1,
html.a11y-highlight-headings h2,
html.a11y-highlight-headings h3,
html.a11y-highlight-headings h4 {
  outline: 2px solid var(--a11y-accent, var(--neon, #ff5e3a)) !important;
  outline-offset: 3px;
  border-radius: 4px;
}

/* Big cursor: !important is deliberate — the one property inline styles do
   not automatically win against when the stylesheet rule itself carries
   !important, and many components set their own inline cursor: pointer. */
html.a11y-big-cursor,
html.a11y-big-cursor * {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cpath d='M4 2l15 12.2-6.2.9 3.3 7.1-2.9 1.3-3.3-7.1-4.4 4.1z' fill='%23111' stroke='%23fff' stroke-width='1.3'/%3E%3C/svg%3E") 4 4, auto !important;
}

/* Recede images: opacity, NOT display:none/visibility:hidden — those strip
   an element from the accessibility tree, which would take alt text away
   from the assistive-tech users this widget exists for. This is a purely
   VISUAL de-emphasis for a sighted visitor who wants fewer stimuli; the
   image stays exactly as reachable to a screen reader as before. */
html.a11y-hide-images img:not([data-a11y-keep]) {
  opacity: 0.04 !important;
  transition: opacity .2s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1));
}

html.a11y-readable-font,
html.a11y-readable-font * {
  font-family: Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif !important;
  letter-spacing: 0.01em;
}

@media (prefers-reduced-motion: reduce) {
  .a11y-switch-thumb, .a11y-switch-track, .a11yw-scrim, .a11yw-panel { animation: none !important; transition: none !important; }
}

.a11yw-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
`
