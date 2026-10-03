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
  box-sizing: border-box;
  /* A 22px glyph centred in 48px is 13px of side padding. min-width, not
     width: the first-visit intro widens the button into a pill to show its
     label, and it shrinks back to this exact circle afterwards. */
  min-width: 48px; height: 48px; padding: 0 13px;
  display: inline-flex; align-items: center; justify-content: center;
  /* Physical layout, always. The icon stays on the screen-edge side whatever
     the page direction; the label sets its own direction (dir on its span). */
  direction: ltr;
  border: 0; border-radius: 999px;
  background: linear-gradient(135deg, var(--a11y-accent, var(--neon, #ff5e3a)), var(--a11y-accent-soft, var(--neon-soft, #ff8a5c)));
  /* WCAG 1.4.3: white on this gradient computes under 4.5:1 in places —
     verified against both fallback and typical host colors before choosing
     a background this dark. */
  color: var(--a11y-bg, var(--bg, #0b0b12));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 0 24px rgba(255, 94, 58, 0.35);
  cursor: pointer;
  font-family: inherit;
  transition: transform .12s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1)), filter .12s ease;
  /* Which way the button "comes from" for its entrance and outro: -1/+1 on
     each axis, and the screen corner it scales toward. Set per corner below. */
  --a11yw-fx: 1; --a11yw-fy: 1; --a11yw-origin: 100% 100%;
}
.a11y-fab:active { transform: scale(.96); filter: brightness(1.18); }
.a11y-fab-tl { left: 16px;  top: calc(env(safe-area-inset-top) + 16px);       flex-direction: row-reverse; --a11yw-fx: -1; --a11yw-fy: -1; --a11yw-origin: 0 0; }
.a11y-fab-tr { right: 16px; top: calc(env(safe-area-inset-top) + 16px);       flex-direction: row;         --a11yw-fx: 1;  --a11yw-fy: -1; --a11yw-origin: 100% 0; }
.a11y-fab-bl { left: 16px;  bottom: calc(env(safe-area-inset-bottom) + 16px); flex-direction: row-reverse; --a11yw-fx: -1; --a11yw-fy: 1;  --a11yw-origin: 0 100%; }
.a11y-fab-br { right: 16px; bottom: calc(env(safe-area-inset-bottom) + 16px); flex-direction: row;         --a11yw-fx: 1;  --a11yw-fy: 1;  --a11yw-origin: 100% 100%; }

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

/* A key name ("F2"), set apart from the sentence it sits in. direction +
   unicode-bidi isolate keep it one left-to-right run, which is what stops it
   reordering the words around it inside a Hebrew or Arabic sentence. */
.a11yw-kbd {
  display: inline-block; direction: ltr; unicode-bidi: isolate;
  padding: 1px 6px; margin: 0 2px; border-radius: 6px;
  border: 1px solid var(--a11y-line-strong, var(--line-strong, rgba(245,243,239,0.22)));
  background: rgba(255, 255, 255, 0.07);
  color: inherit; letter-spacing: 0;
  font: 700 0.78em/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

/* ============================================================
   Launcher: entrance, first-visit intro, outro.
   The spring curve is for exactly this kind of moment (a button being
   summoned); every other bit of travel in this file uses --a11y-ease.
   These are mount-time animations — a data attribute that is present when
   the button mounts — never toggled live, because flipping animation-name
   between none and a value restarts the animation instead of resuming it.
   They use fill-mode backwards only, so the button's own resting style is
   what is left afterwards and its press feedback and corner glide (both
   transform) keep working. Nothing here positions with transform.
   ============================================================ */
.a11y-fab[data-intro] {
  animation: a11yw-fab-in .6s var(--a11y-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) .15s backwards;
}
/* The very first visit waits a beat longer, so it lands after the page's own
   load-in has settled instead of competing with it. */
.a11y-fab[data-intro='full'] { animation-delay: .5s; }
@keyframes a11yw-fab-in {
  from {
    transform-origin: var(--a11yw-origin);
    transform: translate(calc(var(--a11yw-fx) * 22px), calc(var(--a11yw-fy) * 22px)) scale(.3);
    opacity: 0;
  }
  45% { opacity: 1; }
  to { transform-origin: var(--a11yw-origin); transform: none; opacity: 1; }
}

/* First visit only: one soft pulse of the accent colour, then a label pill
   that slides out of the button, holds long enough to read, and folds back
   into the circle. Width is animated as grid-template-columns 0fr -> 1fr (the
   same trick the house uses for accordions) because the pill's natural width
   depends on the language, and a fixed max-width would run out of easing
   before the text did. */
.a11y-fab[data-intro='full']::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  border: 2px solid rgba(255, 94, 58, 0.6);
  border-color: color-mix(in srgb, var(--a11y-accent, var(--neon, #ff5e3a)) 65%, transparent);
  animation: a11yw-fab-ring 1.3s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1)) 1s 2 backwards;
}
@keyframes a11yw-fab-ring {
  from { transform: scale(1); opacity: .9; }
  to   { transform: scale(2.1); opacity: 0; }
}
.a11y-fab-label {
  display: grid; grid-template-columns: 0fr;
  animation: a11yw-fab-label 5.4s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1)) 1.4s backwards;
}
.a11y-fab-label-clip { min-width: 0; overflow: hidden; }
.a11y-fab-label-inner {
  display: flex; align-items: center; gap: 8px; white-space: nowrap;
  font-size: 0.85rem; font-weight: 700; letter-spacing: 0.01em; line-height: 1;
  opacity: 0;
  animation: a11yw-fab-label-text 5.4s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1)) 1.4s backwards;
}
/* The gap between the text and the icon goes on whichever side faces the
   icon: physical sides, because the icon is always on the screen-edge side. */
.a11y-fab-tr .a11y-fab-label-inner, .a11y-fab-br .a11y-fab-label-inner { padding-right: 10px; }
.a11y-fab-tl .a11y-fab-label-inner, .a11y-fab-bl .a11y-fab-label-inner { padding-left: 10px; }
.a11y-fab-label-inner .a11yw-kbd { margin: 0; background: rgba(0, 0, 0, 0.14); border-color: rgba(0, 0, 0, 0.3); }
@keyframes a11yw-fab-label {
  0%       { grid-template-columns: 0fr; }
  9%, 88%  { grid-template-columns: 1fr; }
  100%     { grid-template-columns: 0fr; }
}
@keyframes a11yw-fab-label-text {
  0%, 3%    { opacity: 0; }
  14%, 82%  { opacity: 1; }
  96%, 100% { opacity: 0; }
}

/* The outro: a small anticipation swell, then it is drawn back into the
   corner it lives in. fill-mode forwards — it ends invisible and is
   unmounted a moment later (LAUNCHER_LEAVE_MS in lifecycle.ts). */
.a11y-fab[data-phase='leaving'] {
  pointer-events: none;
  animation: a11yw-fab-out .38s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1)) forwards;
}
@keyframes a11yw-fab-out {
  0%   { transform-origin: var(--a11yw-origin); transform: none; opacity: 1; }
  28%  { transform: scale(1.1); opacity: 1; }
  100% {
    transform-origin: var(--a11yw-origin);
    transform: translate(calc(var(--a11yw-fx) * 12px), calc(var(--a11yw-fy) * 12px)) scale(.2);
    opacity: 0;
  }
}

/* Reduce: the launcher simply appears and disappears, and the first-visit
   pill is skipped — the button's own accessible name already says what it is. */
@media (prefers-reduced-motion: reduce) {
  .a11y-fab[data-intro], .a11y-fab[data-phase='leaving'], .a11y-fab[data-intro='full']::after,
  .a11y-fab-label, .a11y-fab-label-inner { animation: none !important; }
}
/* No F2 key to speak of on a touch-only device. */
@media (hover: none) and (pointer: coarse) {
  .a11y-fab-label-inner .a11yw-kbd { display: none; }
}

/* ============================================================
   Toast: shown after the launcher is hidden, in the corner it just left.
   Never animate an element that carries a backdrop-filter — this has none,
   on purpose; the card is opaque.
   ============================================================ */
.a11yw-toast-region {
  position: fixed; z-index: 2147483001;
  width: min(360px, calc(100vw - 32px));
  display: flex; flex-direction: column;
  pointer-events: none;
}
.a11yw-toast-tl { left: 16px;  top: calc(env(safe-area-inset-top) + 16px);       --a11yw-fx: -1; --a11yw-fy: -1; --a11yw-origin: 0 0; }
.a11yw-toast-tr { right: 16px; top: calc(env(safe-area-inset-top) + 16px);       --a11yw-fx: 1;  --a11yw-fy: -1; --a11yw-origin: 100% 0; }
.a11yw-toast-bl { left: 16px;  bottom: calc(env(safe-area-inset-bottom) + 16px); --a11yw-fx: -1; --a11yw-fy: 1;  --a11yw-origin: 0 100%; }
.a11yw-toast-br { right: 16px; bottom: calc(env(safe-area-inset-bottom) + 16px); --a11yw-fx: 1;  --a11yw-fy: 1;  --a11yw-origin: 100% 100%; }

.a11yw-toast {
  position: relative; overflow: hidden; box-sizing: border-box; width: 100%;
  pointer-events: auto;
  display: flex; flex-direction: column; gap: 10px;
  padding: 14px;
  border-radius: 18px;
  background: var(--a11y-bg-elev, var(--bg-elev-2, #1d1d2b));
  color: var(--a11y-text, var(--text, #f5f3ef));
  border: 1px solid var(--a11y-line-strong, var(--line-strong, rgba(245,243,239,0.14)));
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
  font-family: inherit; font-size: 1rem;
  transform-origin: var(--a11yw-origin, 50% 50%);
  /* The .2s delay lets the launcher's outro get going first, so the two read
     as one gesture: the button is drawn into the corner and the toast grows
     out of it. */
  animation: a11yw-toast-in .46s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1)) .2s backwards;
}
.a11yw-toast[data-state='out'] {
  pointer-events: none;
  animation: a11yw-toast-out .22s var(--a11y-ease, cubic-bezier(0.22,1,0.36,1)) forwards;
}
@keyframes a11yw-toast-in {
  from { opacity: 0; transform: translate(calc(var(--a11yw-fx) * 16px), calc(var(--a11yw-fy) * 16px)) scale(.9); }
  to   { opacity: 1; transform: none; }
}
@keyframes a11yw-toast-out {
  from { opacity: 1; transform: none; }
  to   { opacity: 0; transform: translate(calc(var(--a11yw-fx) * 12px), calc(var(--a11yw-fy) * 12px)) scale(.94); }
}

.a11yw-toast-head { display: flex; align-items: flex-start; gap: 10px; }
.a11yw-toast-icon {
  flex: 0 0 auto; width: 34px; height: 34px; border-radius: 999px;
  display: grid; place-items: center;
  background: linear-gradient(135deg, var(--a11y-accent, var(--neon, #ff5e3a)), var(--a11y-accent-soft, var(--neon-soft, #ff8a5c)));
  color: var(--a11y-bg, var(--bg, #0b0b12));
}
.a11yw-toast-text { flex: 1 1 auto; min-width: 0; padding-top: 1px; }
.a11yw-toast-title { margin: 0; font-size: 0.92rem; font-weight: 800; line-height: 1.35; }
.a11yw-toast-sub { margin: 2px 0 0; font-size: 0.78rem; line-height: 1.45; color: var(--a11y-text-dim, var(--text-dim, #a8a5b0)); }
/* A 44px target tucked into the card's corner with negative margins, so the
   card stays compact without the dismiss control being fiddly. */
.a11yw-toast-close {
  position: relative;
  flex: 0 0 auto; width: 44px; height: 44px; margin: -8px; margin-inline-start: 0;
  display: grid; place-items: center; padding: 0;
  border: 0; border-radius: 999px; background: transparent;
  color: var(--a11y-text-dim, var(--text-dim, #a8a5b0)); cursor: pointer;
}
.a11yw-toast-close:hover { color: var(--a11y-text, var(--text, #f5f3ef)); background: rgba(255, 255, 255, 0.06); }

.a11yw-toast-hints {
  display: flex; flex-direction: column; gap: 6px;
  padding: 10px 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.04);
}
.a11yw-toast-hint { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 0.8rem; line-height: 1.5; }
.a11yw-toast-hint svg { flex: 0 0 auto; color: var(--a11y-accent, var(--neon, #ff5e3a)); }
.a11yw-toast-actions { display: flex; justify-content: flex-end; }
/* Dark text on the accent gradient, like the launcher it restores: white
   computes under 4.5:1 here (see the note on .a11y-fab). */
.a11yw-toast-restore {
  padding: 10px 18px; min-height: 40px; border: 0; border-radius: 999px;
  font: inherit; font-size: 0.85rem; font-weight: 800; cursor: pointer;
  background: linear-gradient(135deg, var(--a11y-accent, var(--neon, #ff5e3a)), var(--a11y-accent-soft, var(--neon-soft, #ff8a5c)));
  color: var(--a11y-bg, var(--bg, #0b0b12));
  box-shadow: 0 0 16px rgba(255, 94, 58, 0.28);
}
.a11yw-toast-restore:focus-visible, .a11yw-toast-close:focus-visible {
  outline: 2px solid var(--a11y-text, var(--text, #f5f3ef)); outline-offset: 2px;
}

/* The time left, drawn as a RING around the close button that drains — the way
   Waze's prompts count down — so the visitor can see the toast is about to
   close itself and that the X is the way to do it sooner. (1.1.0 had a 3px line
   along the bottom edge that nobody noticed.) Decoration only: the dismiss
   clock is JS (see A11yToast), so this can be flattened by "Pause animations"
   or reduced motion without the toast vanishing early. It freezes in step with
   the clock while the visitor is engaging with the toast (data-paused).
   r=19 in a 44-unit box: circumference 2*pi*19 = 119.38. */
.a11yw-toast-ring {
  position: absolute; inset: 0; width: 100%; height: 100%;
  transform: rotate(-90deg); /* start at 12 o'clock */
  pointer-events: none; overflow: visible;
}
.a11yw-toast-ring circle { fill: none; stroke-width: 2.5; }
.a11yw-toast-ring-track { stroke: rgba(255, 255, 255, 0.10); }
.a11yw-toast-ring-fill {
  stroke: var(--a11y-accent, var(--neon, #ff5e3a)); stroke-linecap: round;
  stroke-dasharray: 119.4; stroke-dashoffset: 0;
  animation: a11yw-toast-ring var(--a11yw-toast-ms, 5s) linear forwards;
}
.a11yw-toast[data-paused='true'] .a11yw-toast-ring-fill { animation-play-state: paused; }
@keyframes a11yw-toast-ring { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 119.4; } }

/* Reduce: it just appears and goes. The ring is dropped — it is the one part
   that is motion and nothing else. */
@media (prefers-reduced-motion: reduce) {
  .a11yw-toast { animation: none !important; }
  .a11yw-toast-ring { display: none; }
}
html.a11y-motion-off .a11yw-toast-ring { display: none; }
/* No F2 key on a touch-only device — the button below is the way back. */
@media (hover: none) and (pointer: coarse) {
  .a11yw-toast-keyhint { display: none; }
}

/* ============================================================
   Panel: the corner picker and the hide control.
   ============================================================ */
.a11yw-corner-picker { display: flex; flex-direction: column; align-items: center; gap: 8px; }
/* A miniature screen with a target in each corner. direction: ltr — physical
   order, so top-left is at the top left of the preview under RTL too. */
.a11yw-corners {
  position: relative; box-sizing: border-box; direction: ltr;
  width: 100%; max-width: 264px; aspect-ratio: 16 / 9;
  border-radius: 16px; overflow: hidden;
  border: 1px solid var(--a11y-line-strong, var(--line-strong, rgba(245,243,239,0.14)));
  background: var(--a11y-bg-elev, var(--bg-elev-2, #1d1d2b));
}
/* A few quiet lines so the box reads as a page, kept well clear of the four
   corner targets. */
.a11yw-corners-screen {
  position: absolute; inset: 24% 22%; border-radius: 4px; pointer-events: none; opacity: .55;
  background: repeating-linear-gradient(to bottom, var(--a11y-line-strong, var(--line-strong, rgba(245,243,239,0.14))) 0 5px, transparent 5px 14px);
}
.a11yw-corner {
  position: absolute; width: 44px; height: 44px; padding: 0;
  display: grid; place-items: center;
  border: 0; border-radius: 12px; background: transparent; cursor: pointer;
}
.a11yw-corner-top-left     { top: 2px;    left: 2px; }
.a11yw-corner-top-right    { top: 2px;    right: 2px; }
.a11yw-corner-bottom-left  { bottom: 2px; left: 2px; }
.a11yw-corner-bottom-right { bottom: 2px; right: 2px; }
.a11yw-corner-dot {
  width: 26px; height: 26px; border-radius: 999px;
  display: grid; place-items: center;
  border: 2px dashed var(--a11y-line-strong, var(--line-strong, rgba(245,243,239,0.3)));
  color: transparent; transform: scale(.85);
  /* The spring is for a radio being chosen — it is one of the few moments the
     house gives it to. A transition, not an animation, so it fires on the
     change and not every time the panel opens. */
  transition:
    transform .35s var(--a11y-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
    background .2s ease, border-color .2s ease, box-shadow .25s ease, color .2s ease;
}
.a11yw-corner:hover .a11yw-corner-dot { border-color: var(--a11y-accent, var(--neon, #ff5e3a)); }
.a11yw-corner[aria-checked='true'] .a11yw-corner-dot {
  border-color: transparent; transform: scale(1);
  background: linear-gradient(135deg, var(--a11y-accent, var(--neon, #ff5e3a)), var(--a11y-accent-soft, var(--neon-soft, #ff8a5c)));
  color: var(--a11y-bg, var(--bg, #0b0b12));
  box-shadow: 0 0 14px rgba(255, 94, 58, 0.35);
}
/* Inset: the picker clips its children (overflow: hidden), so an outside ring
   would be cut off on the edges these targets sit against. */
.a11yw-corner:focus-visible { outline: 2px solid var(--a11y-accent, var(--neon, #ff5e3a)); outline-offset: -4px; }
.a11yw-corner-caption { margin: 0; font-size: 0.8rem; font-weight: 600; color: var(--a11y-text-dim, var(--text-dim, #a8a5b0)); }

.a11yw-btn-ghost {
  display: flex; align-items: center; gap: 12px; width: 100%; box-sizing: border-box;
  padding: 10px 14px; border-radius: 14px; text-align: start;
  border: 1px dashed var(--a11y-line-strong, var(--line-strong, rgba(245,243,239,0.14)));
  background: transparent; color: var(--a11y-text, var(--text, #f5f3ef));
  font-family: inherit; cursor: pointer;
}
.a11yw-btn-ghost-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.a11yw-btn-ghost-label { font-size: 0.9rem; font-weight: 700; }
.a11yw-btn-ghost-hint { font-size: 0.76rem; line-height: 1.5; color: var(--a11y-text-dim, var(--text-dim, #a8a5b0)); }

@media (prefers-reduced-motion: reduce) {
  .a11yw-corner-dot { transition: none !important; }
}

/* Windows high-contrast: the gradients and tints above are dropped by the
   system, so the shapes that carry meaning get real borders. */
@media (forced-colors: active) {
  .a11yw-toast { border: 1px solid CanvasText; }
  .a11yw-corner-dot { border: 2px solid ButtonText; }
  .a11yw-corner[aria-checked='true'] .a11yw-corner-dot { border-color: Highlight; background: Highlight; color: HighlightText; }
}
`
