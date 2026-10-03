#!/usr/bin/env node
// Logic harness for the shared accessibility widget.
//
//   node scripts/check-a11y.mjs
//
// The widget's rules are pure functions with no DOM, so they are checked
// exhaustively in milliseconds by transpiling and running the REAL
// TypeScript sources — copying the logic in here would produce a harness
// that passes while the package is broken.
//
// WHAT IT IS ACTUALLY GUARDING
//   • sanitizeA11yPrefs never trusts localStorage — a corrupted or hand-edited
//     value must fall back per-field, never throw, never poison the whole
//     object over one bad key.
//   • computeAppliedState is deterministic and every class it can produce is
//     accounted for in ALL_A11Y_HTML_CLASSES — the provider diffs against
//     that list to know what to remove, so a drift here is a class that gets
//     added but never cleaned up.
//   • Every panel string, quick-profile label/description, and coverage-item
//     label exists in all three languages (he/en/ar) — a missing language is
//     a silent blank in the UI, not a crash, so nothing else would catch it.
//   • sanitizeA11yUi (corner choice + intro-seen) holds the same never-trust
//     discipline as the prefs, and the corner list stays pinned to the type.
//   • The launcher lifecycle reducer (hide / restore / toast) keeps its four
//     invariants under any sequence of events, not just the ones a person
//     would think to click — see lifecycle.ts.
//   • The `{key}` placeholder appears in exactly the strings that are rendered
//     through withKey(), so it can neither leak into an aria-label as literal
//     braces nor go missing from a sentence that is meant to name the key.

import ts from 'typescript'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// ── transpile ──────────────────────────────────────────────────────────

const SRC = new URL('../src/', import.meta.url)
const outDir = join(tmpdir(), `a11y-widget-check-${process.pid}`)
mkdirSync(outDir, { recursive: true })

function emit(name) {
  const source = readFileSync(new URL(name, SRC), 'utf8')
  const js = ts.transpileModule(source, {
    fileName: name,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  }).outputText.replace(/from '(\.\/[^']+)'/g, "from '$1.mjs'")
  writeFileSync(join(outDir, name.replace(/\.ts$/, '.mjs')), js)
}

for (const f of ['types.ts', 'storage.ts', 'apply.ts', 'i18n.ts', 'coverage.ts', 'corners.ts', 'lifecycle.ts']) emit(f)

const load = (name) => import(pathToFileURL(join(outDir, name)).href)
const T = await load('types.mjs')
const S = await load('storage.mjs')
const A = await load('apply.mjs')
const I18n = await load('i18n.mjs')
const Cov = await load('coverage.mjs')
const C = await load('corners.mjs')
const L = await load('lifecycle.mjs')

// ── harness ────────────────────────────────────────────────────────────

let pass = 0
const failures = []
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { failures.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}
const section = (title) => console.log(`\n${title}`)

// ── 1. sanitizeA11yPrefs — never trusts the input ──────────────────────
section('sanitizeA11yPrefs — garbage in, defaults or bounded values out')
{
  const d = T.DEFAULT_A11Y_PREFS
  check('null returns defaults', JSON.stringify(S.sanitizeA11yPrefs(null)) === JSON.stringify(d))
  check('undefined returns defaults', JSON.stringify(S.sanitizeA11yPrefs(undefined)) === JSON.stringify(d))
  check('a string returns defaults', JSON.stringify(S.sanitizeA11yPrefs('nope')) === JSON.stringify(d))
  check('an array returns defaults', JSON.stringify(S.sanitizeA11yPrefs([1, 2, 3])) === JSON.stringify(d))
  check('an empty object returns defaults', JSON.stringify(S.sanitizeA11yPrefs({})) === JSON.stringify(d))

  check('an out-of-range fontScale falls back',
    S.sanitizeA11yPrefs({ fontScale: 99 }).fontScale === d.fontScale)
  check('a negative fontScale falls back',
    S.sanitizeA11yPrefs({ fontScale: -1 }).fontScale === d.fontScale)
  check('a valid fontScale survives',
    S.sanitizeA11yPrefs({ fontScale: 3 }).fontScale === 3)

  check('an invented contrast mode falls back',
    S.sanitizeA11yPrefs({ contrast: 'rainbow' }).contrast === d.contrast)
  check('a valid contrast mode survives',
    S.sanitizeA11yPrefs({ contrast: 'invert' }).contrast === 'invert')

  check('a non-boolean pauseAnimations falls back',
    S.sanitizeA11yPrefs({ pauseAnimations: 'yes' }).pauseAnimations === d.pauseAnimations)
  check('a real boolean pauseAnimations survives',
    S.sanitizeA11yPrefs({ pauseAnimations: true }).pauseAnimations === true)
  check('a non-boolean hideImages falls back',
    S.sanitizeA11yPrefs({ hideImages: 'yes' }).hideImages === d.hideImages)
  check('a non-boolean readableFont falls back',
    S.sanitizeA11yPrefs({ readableFont: 1 }).readableFont === d.readableFont)

  check('one bad field does not poison the rest',
    JSON.stringify(S.sanitizeA11yPrefs({ fontScale: 'nope', spacing: 2 })) ===
    JSON.stringify({ ...d, spacing: 2 }))

  check('an unknown extra key is silently dropped',
    S.sanitizeA11yPrefs({ evil: '<script>' }).evil === undefined)

  check('loadA11yPrefs/saveA11yPrefs use the caller-supplied key, not a hardcoded one',
    typeof S.loadA11yPrefs === 'function' && S.loadA11yPrefs.length === 1 &&
    typeof S.saveA11yPrefs === 'function' && S.saveA11yPrefs.length === 2)
}

// ── 2. computeAppliedState — deterministic, bounds-respecting ─────────
section('computeAppliedState — deterministic plan, no DOM access')
{
  const d = T.DEFAULT_A11Y_PREFS
  const a = A.computeAppliedState(d)
  const b = A.computeAppliedState(d)
  check('same input produces an identical plan twice', JSON.stringify(a) === JSON.stringify(b))

  check('defaults produce no root classes', a.rootClasses.length === 0)
  check('defaults produce filter none', a.scopeFilter === 'none')
  check('defaults produce 100% font scale', a.rootVars['--a11y-font-scale'] === '100%')

  check('max fontScale index is in bounds',
    A.computeAppliedState({ ...d, fontScale: 4 }).rootVars['--a11y-font-scale'] === '150%')

  check('pauseAnimations adds exactly the motion class',
    A.computeAppliedState({ ...d, pauseAnimations: true }).rootClasses.includes('a11y-motion-off'))
  check('highlightLinks adds exactly the link class',
    A.computeAppliedState({ ...d, highlightLinks: true }).rootClasses.includes('a11y-highlight-links'))
  check('highlightHeadings adds exactly the heading class',
    A.computeAppliedState({ ...d, highlightHeadings: true }).rootClasses.includes('a11y-highlight-headings'))
  check('bigCursor adds exactly the cursor class',
    A.computeAppliedState({ ...d, bigCursor: true }).rootClasses.includes('a11y-big-cursor'))
  check('hideImages adds exactly the hide-images class',
    A.computeAppliedState({ ...d, hideImages: true }).rootClasses.includes('a11y-hide-images'))
  check('readableFont adds exactly the readable-font class',
    A.computeAppliedState({ ...d, readableFont: true }).rootClasses.includes('a11y-readable-font'))
  check('readingGuide adds NO root class (it is a mounted component, not a class)',
    !A.computeAppliedState({ ...d, readingGuide: true }).rootClasses.some((c) => c.includes('reading')))

  check('contrast high maps to a contrast() filter',
    A.computeAppliedState({ ...d, contrast: 'high' }).scopeFilter.includes('contrast'))
  check('contrast grayscale maps to grayscale(1)',
    A.computeAppliedState({ ...d, contrast: 'grayscale' }).scopeFilter === 'grayscale(1)')
  check('contrast invert maps to an invert() filter',
    A.computeAppliedState({ ...d, contrast: 'invert' }).scopeFilter.includes('invert'))

  // Every class the function can ever emit must be tracked in
  // ALL_A11Y_HTML_CLASSES, or the provider can never clean it up again.
  const allPossible = new Set()
  for (const pauseAnimations of [false, true])
    for (const highlightLinks of [false, true])
      for (const highlightHeadings of [false, true])
        for (const bigCursor of [false, true])
          for (const hideImages of [false, true])
            for (const readableFont of [false, true]) {
              const { rootClasses } = A.computeAppliedState({
                ...d, pauseAnimations, highlightLinks, highlightHeadings, bigCursor, hideImages, readableFont,
              })
              rootClasses.forEach((c) => allPossible.add(c))
            }
  const tracked = new Set(A.ALL_A11Y_HTML_CLASSES)
  const untracked = [...allPossible].filter((c) => !tracked.has(c))
  check('every emittable class is tracked in ALL_A11Y_HTML_CLASSES', untracked.length === 0, untracked.join(', '))
}

// ── 3. i18n — every string, profile and coverage item is trilingual ────
section('i18n — every panel string, quick profile and coverage item is trilingual')
{
  const langs = ['he', 'en', 'ar']

  function checkTrilingual(label, items, pick) {
    let allGood = true
    for (const item of items) {
      for (const lang of langs) {
        const v = pick(item, lang)
        if (typeof v !== 'string' || v.trim() === '') {
          allGood = false
          console.log(`  ✗ ${label} missing/empty ${lang} for ${JSON.stringify(item).slice(0, 60)}`)
        }
      }
    }
    check(`all ${items.length} ${label} are trilingual`, allGood)
  }

  checkTrilingual('A11Y_UI strings', Object.keys(I18n.A11Y_UI), (key, lang) => I18n.A11Y_UI[key]?.[lang])
  checkTrilingual('QUICK_PROFILES labels', T.QUICK_PROFILES, (p, lang) => p.labels?.[lang])
  checkTrilingual('QUICK_PROFILES descriptions', T.QUICK_PROFILES, (p, lang) => p.descriptions?.[lang])
  checkTrilingual('WIDGET_COVERAGE labels', Cov.WIDGET_COVERAGE, (c, lang) => c.labels?.[lang])

  check('a11yT resolves a real string', I18n.a11yT('title', 'he') === I18n.A11Y_UI.title.he)

  check('every QUICK_PROFILES.patch key is a real A11yPrefs field', T.QUICK_PROFILES.every(
    (p) => Object.keys(p.patch).every((k) => k in T.DEFAULT_A11Y_PREFS),
  ))
  check('WIDGET_COVERAGE ids are unique', new Set(Cov.WIDGET_COVERAGE.map((c) => c.id)).size === Cov.WIDGET_COVERAGE.length)
  check('QUICK_PROFILES ids are unique', new Set(T.QUICK_PROFILES.map((p) => p.id)).size === T.QUICK_PROFILES.length)

  // `{key}` is swapped for a <kbd> by withKey() — and ONLY in the strings the
  // components actually pass through it. Anywhere else it would render as
  // literal braces (an aria-label, an announcement); and a string that is
  // meant to name the key but lost its placeholder would silently stop doing so.
  const WITH_KEY = new Set(['hideHint', 'toastKeyHint'])
  const keyMismatches = []
  for (const key of Object.keys(I18n.A11Y_UI)) {
    for (const lang of langs) {
      const has = I18n.A11Y_UI[key][lang].includes('{key}')
      if (has !== WITH_KEY.has(key)) keyMismatches.push(`${key}.${lang}`)
    }
  }
  check('{key} appears in exactly the strings rendered through withKey()', keyMismatches.length === 0, keyMismatches.join(', '))

  check('every launcher corner has a label string in i18n',
    ['cornerTopLeft', 'cornerTopRight', 'cornerBottomLeft', 'cornerBottomRight'].every((k) => k in I18n.A11Y_UI) &&
    T.A11Y_CORNERS.length === 4)
  check('the new coverage items exist',
    ['launcher-position', 'hide-launcher'].every((id) => Cov.WIDGET_COVERAGE.some((c) => c.id === id)))
}

// ── 4. widget-UI state — corner choice and intro-seen ──────────────────
section('sanitizeA11yUi — same never-trust discipline as the prefs')
{
  const d = T.DEFAULT_A11Y_UI
  const j = JSON.stringify

  check('the default is "never chose a corner, intro not yet seen"', d.corner === null && d.introSeen === false)
  check('null / undefined / a string / an array all return the default',
    [null, undefined, 'nope', [1, 2]].every((v) => j(S.sanitizeA11yUi(v)) === j(d)))
  check('every real corner survives',
    T.A11Y_CORNERS.every((c) => S.sanitizeA11yUi({ corner: c }).corner === c))
  check('an invented corner falls back to null (use the host default)',
    S.sanitizeA11yUi({ corner: 'middle' }).corner === null)
  check('a logical corner ("start-top") is rejected — corners are physical only',
    S.sanitizeA11yUi({ corner: 'top-start' }).corner === null)
  check('a non-string corner falls back', S.sanitizeA11yUi({ corner: 3 }).corner === null)
  check('introSeen survives as a real boolean', S.sanitizeA11yUi({ introSeen: true }).introSeen === true)
  check('a non-boolean introSeen falls back to false', S.sanitizeA11yUi({ introSeen: 'yes' }).introSeen === false)
  check('one bad field does not poison the other',
    j(S.sanitizeA11yUi({ corner: 'nope', introSeen: true })) === j({ corner: null, introSeen: true }))
  check('an unknown extra key is silently dropped', S.sanitizeA11yUi({ evil: '<script>' }).evil === undefined)

  check('the UI blob lives under its own key, never the prefs key',
    S.a11yUiStorageKey('ayeka.a11y.prefs.v1') !== 'ayeka.a11y.prefs.v1' &&
    S.a11yUiStorageKey('ayeka.a11y.prefs.v1').startsWith('ayeka.a11y.prefs.v1'))

  // load/save against a stand-in localStorage. The modules read `window` at
  // call time, so stubbing the global is enough.
  const store = new Map()
  globalThis.window = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)) },
    },
  }
  const key = S.a11yUiStorageKey('test:prefs')
  check('nothing stored loads as the default', j(S.loadA11yUi(key)) === j(d))
  S.saveA11yUi(key, { corner: 'top-left', introSeen: true })
  check('a saved value round-trips', j(S.loadA11yUi(key)) === j({ corner: 'top-left', introSeen: true }))
  store.set(key, '{not json')
  check('corrupt JSON loads as the default and does not throw', j(S.loadA11yUi(key)) === j(d))
  store.set(key, j({ corner: 'bottom-left', introSeen: 1, junk: [] }))
  check('a half-valid blob keeps its valid half',
    j(S.loadA11yUi(key)) === j({ corner: 'bottom-left', introSeen: false }))
  globalThis.window = {
    localStorage: {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('quota') },
    },
  }
  check('blocked storage: load returns the default', j(S.loadA11yUi(key)) === j(d))
  let saveThrew = false
  try { S.saveA11yUi(key, d) } catch { saveThrew = true }
  check('blocked storage: save does not throw', !saveThrew)
  delete globalThis.window
  check('no window (server render): load returns the default', j(S.loadA11yUi(key)) === j(d))
}

// ── 4b. resolveA11yConfig — a host's explicit `undefined` must not win ──
section('resolveA11yConfig — defaults survive an explicit undefined')
{
  const D = T.DEFAULT_A11Y_CONFIG
  // The regression this exists for: `<A11yWidget config={{ corner: maybeUndefined }} />`.
  // A plain `{ ...defaults, ...config }` copies the undefined over the default
  // and the launcher mounts with no corner at all.
  const r = T.resolveA11yConfig({ corner: undefined, storageKey: undefined, defaultLang: undefined })
  check('explicit undefined corner keeps the default corner', r.corner === D.corner)
  check('explicit undefined storageKey keeps the default key', r.storageKey === D.storageKey)
  check('explicit undefined defaultLang keeps the default language', r.defaultLang === D.defaultLang)
  check('an empty config resolves to exactly the defaults',
    JSON.stringify(T.resolveA11yConfig({})) === JSON.stringify(D))
  check('real values win over the defaults',
    T.resolveA11yConfig({ corner: 'top-left', storageKey: 'k', defaultLang: 'en' }).corner === 'top-left' &&
    T.resolveA11yConfig({ storageKey: 'k' }).storageKey === 'k' &&
    T.resolveA11yConfig({ defaultLang: 'ar' }).defaultLang === 'ar')
  check('an invalid corner from a JS host falls back to the default',
    ['top-start', 'middle', '', null, 3].every((c) => T.resolveA11yConfig({ corner: c }).corner === D.corner))
  check('other config keys pass through untouched',
    T.resolveA11yConfig({ accentColor: '#fff', statementHref: '/a' }).statementHref === '/a' &&
    T.resolveA11yConfig({ accentColor: '#fff' }).accentColor === '#fff')
}

// ── 5. corners — the picker's arrow keys and the corner list ───────────
section('corners — physical corners, and the picker\'s arrow-key moves')
{
  check('A11Y_CORNERS has four unique corners', new Set(T.A11Y_CORNERS).size === 4 && T.A11Y_CORNERS.length === 4)
  check('the package default corner is selectable', T.A11Y_CORNERS.includes(T.DEFAULT_A11Y_CONFIG.corner))
  check('isA11yCorner accepts every corner and nothing else',
    T.A11Y_CORNERS.every(T.isA11yCorner) && !['', 'left', 'top', 'top-start', null, 7].some(T.isA11yCorner))

  const expectH = { 'top-left': 'top-right', 'top-right': 'top-left', 'bottom-left': 'bottom-right', 'bottom-right': 'bottom-left' }
  const expectV = { 'top-left': 'bottom-left', 'top-right': 'bottom-right', 'bottom-left': 'top-left', 'bottom-right': 'top-right' }
  check('horizontal flips left<->right and keeps the row',
    T.A11Y_CORNERS.every((c) => C.flipCorner(c, 'horizontal') === expectH[c]))
  check('vertical flips top<->bottom and keeps the column',
    T.A11Y_CORNERS.every((c) => C.flipCorner(c, 'vertical') === expectV[c]))
  check('flipping an axis twice returns to the start',
    T.A11Y_CORNERS.every((c) => ['horizontal', 'vertical'].every((a) => C.flipCorner(C.flipCorner(c, a), a) === c)))
  check('every move lands on a real corner',
    T.A11Y_CORNERS.every((c) => ['horizontal', 'vertical'].every((a) => T.isA11yCorner(C.flipCorner(c, a)))))
  check('all four corners are reachable from any one of them by arrow keys alone',
    T.A11Y_CORNERS.every((start) => {
      const seen = new Set([start])
      const queue = [start]
      while (queue.length) {
        const c = queue.pop()
        for (const a of ['horizontal', 'vertical']) {
          const n = C.flipCorner(c, a)
          if (!seen.has(n)) { seen.add(n); queue.push(n) }
        }
      }
      return seen.size === 4
    }))
}

// ── 6. lifecycle — hide / restore / toast, as a reducer ────────────────
section('launcher lifecycle — transitions, and invariants under any event order')
{
  const { launcherReducer: step, INITIAL_LAUNCHER_STATE: init } = L
  const run = (s, ...actions) => actions.reduce(step, s)
  const live = run(init, { type: 'READY', firstVisit: true }, { type: 'ENTERED' })

  check('starts pending: nothing to show before hydration', init.phase === 'pending' && init.toast === 'none' && !init.open)
  check('events before READY are ignored (no launcher exists yet)',
    JSON.stringify(run(init, { type: 'OPEN' }, { type: 'TOGGLE' }, { type: 'HIDE', focusToast: true }, { type: 'ENTERED' })) === JSON.stringify(init))

  const first = step(init, { type: 'READY', firstVisit: true })
  check('first visit enters with the FULL intro', first.phase === 'entering' && first.intro === 'full')
  check('a returning visitor enters with the QUICK intro',
    step(init, { type: 'READY', firstVisit: false }).intro === 'quick')
  check('READY is idempotent (React StrictMode runs effects twice)',
    step(first, { type: 'READY', firstVisit: false }) === first)
  check('entering settles to visible', step(first, { type: 'ENTERED' }).phase === 'visible')

  check('OPEN opens the panel', step(live, { type: 'OPEN' }).open === true)
  check('F2 toggles the panel open then closed',
    run(live, { type: 'TOGGLE' }).open === true && run(live, { type: 'TOGGLE' }, { type: 'TOGGLE' }).open === false)

  const hiding = run(live, { type: 'OPEN' }, { type: 'HIDE', focusToast: true })
  check('hide: outro starts, panel closes, toast comes in',
    hiding.phase === 'leaving' && hiding.open === false && hiding.toast === 'in')
  check('hide carries the focus hand-off flag', hiding.focusToast === true)
  check('hiding twice is a no-op (the second click lands on a leaving button)',
    step(hiding, { type: 'HIDE', focusToast: false }) === hiding)
  check('a leaving launcher cannot be opened or toggled into an open state while leaving',
    step(hiding, { type: 'OPEN' }).open === false)
  check('the outro finishing leaves it hidden, toast still up',
    run(hiding, { type: 'LEFT' }).phase === 'hidden' && run(hiding, { type: 'LEFT' }).toast === 'in')

  const hidden = run(hiding, { type: 'LEFT' })
  const viaF2 = step(hidden, { type: 'TOGGLE' })
  check('F2 while hidden restores the launcher AND opens the panel',
    viaF2.phase === 'entering' && viaF2.open === true)
  check('a restore is always the QUICK intro, even after a first-visit full one',
    viaF2.intro === 'quick' && hiding.intro === 'full')
  check('restoring remounts the launcher (epoch bumps) so the entrance replays',
    viaF2.epoch === hidden.epoch + 1)
  check('restoring sends a toast that is still up on its way out', viaF2.toast === 'out')
  const viaButton = step(hidden, { type: 'SHOW', focusLauncher: true })
  check('the toast\'s button restores without opening the panel, and hands focus to the launcher',
    viaButton.phase === 'entering' && viaButton.open === false && viaButton.focusLauncher === true)
  check('F2 pressed mid-outro interrupts it and restores',
    step(hiding, { type: 'TOGGLE' }).phase === 'entering' && step(hiding, { type: 'TOGGLE' }).open === true)
  check('SHOW on a launcher that is already visible does nothing', step(live, { type: 'SHOW', focusLauncher: true }) === live)

  const dismissed = step(hidden, { type: 'TOAST_DISMISS' })
  check('dismissing the toast starts its exit; launcher stays hidden',
    dismissed.toast === 'out' && dismissed.phase === 'hidden')
  check('F2 still restores after the toast is gone — it is the way back',
    step(run(dismissed, { type: 'TOAST_GONE' }), { type: 'TOGGLE' }).phase === 'entering')
  check('TOAST_GONE only unmounts a toast that was leaving',
    step(hidden, { type: 'TOAST_GONE' }) === hidden && run(dismissed, { type: 'TOAST_GONE' }).toast === 'none')
  check('hiding again while the previous toast is still leaving brings a fresh one in',
    step(run(viaButton, { type: 'ENTERED' }), { type: 'HIDE', focusToast: false }).toast === 'in')

  // Random walk: fire a few thousand arbitrary sequences of events and check
  // the four invariants after EVERY step, not just at the end. Seeded, so a
  // failure is reproducible from the seed printed below.
  const SEED = 0xa11c0de
  let rng = SEED
  const rand = () => {
    rng |= 0; rng = (rng + 0x6d2b79f5) | 0
    let t = Math.imul(rng ^ (rng >>> 15), 1 | rng)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const pick = (xs) => xs[Math.floor(rand() * xs.length)]
  const ACTIONS = [
    { type: 'READY', firstVisit: true }, { type: 'READY', firstVisit: false },
    { type: 'OPEN' }, { type: 'CLOSE' }, { type: 'TOGGLE' },
    { type: 'HIDE', focusToast: true }, { type: 'HIDE', focusToast: false },
    { type: 'SHOW', focusLauncher: true }, { type: 'SHOW', focusLauncher: false },
    { type: 'ENTERED' }, { type: 'LEFT' }, { type: 'TOAST_DISMISS' }, { type: 'TOAST_GONE' },
  ]
  const away = (p) => p === 'leaving' || p === 'hidden'
  const interactive = (p) => p === 'entering' || p === 'visible'
  let violation = ''
  outer: for (let run_ = 0; run_ < 3000; run_++) {
    let s = init
    let leftPending = false
    for (let i = 0; i < 40; i++) {
      const a = pick(ACTIONS)
      const next = step(s, a)
      if (next.open && !interactive(next.phase)) { violation = `open while ${next.phase} after ${a.type}`; break outer }
      if (next.toast === 'in' && !away(next.phase)) { violation = `toast in while ${next.phase} after ${a.type}`; break outer }
      if (next.epoch < s.epoch) { violation = `epoch went backwards after ${a.type}`; break outer }
      if (next.phase !== 'pending') leftPending = true
      if (leftPending && next.phase === 'pending') { violation = `returned to pending after ${a.type}`; break outer }
      s = next
    }
  }
  check(`3000 random 40-event sequences hold all four invariants (seed 0x${SEED.toString(16)})`, violation === '', violation)

  check('the toast stays up long enough to read (WCAG 2.2.1 spirit: >= 5s) and the outro is brief',
    L.TOAST_VISIBLE_MS >= 5000 && L.LAUNCHER_LEAVE_MS > 0 && L.LAUNCHER_LEAVE_MS < 1000)
  check('…but it closes ITSELF quickly — no longer than 6s (1.1.0 used 10s, and never closed at all after a tap)',
    L.TOAST_VISIBLE_MS <= 6000)
  check('the entrance window covers the longest entrance, so FLIP never measures mid-pop',
    L.LAUNCHER_ENTER_MS >= 1100)
}

// ── 7. the toast's clock — what may hold it ────────────────────────────
//
// 1.1.0 held the clock on ANY focus, and hiding the button from the panel moved
// focus onto the toast by script after a TAP — so on a phone the toast froze its
// own timer and never closed until the visitor pressed X. These pin the rule
// that fixed it.
section('toast — what holds the dismiss clock')
{
  const none = { mouseOver: false, pressed: false, keyboardFocus: false }
  check('nothing happening: the clock runs and the toast closes itself', L.toastHeld(none) === false)
  check('a MOUSE over it holds the clock (WCAG 2.2.1)', L.toastHeld({ ...none, mouseOver: true }) === true)
  check('a pointer pressed and HELD on it keeps it open — touch-and-hold, like a story',
    L.toastHeld({ ...none, pressed: true }) === true)
  check('KEYBOARD focus inside it holds the clock — it never times out from under a keyboard user',
    L.toastHeld({ ...none, keyboardFocus: true }) === true)
  check('any combination of the three holds it', [true, false].every((a) => [true, false].every((b) => [true, false].every((c) =>
    L.toastHeld({ mouseOver: a, pressed: b, keyboardFocus: c }) === (a || b || c)))))

  // The three that must NOT hold it are properties of how the component reads
  // the browser, which the pure rule cannot see — so they are pinned at the
  // source, where a regression would have to appear.
  const toast = readFileSync(new URL('A11yToast.tsx', SRC), 'utf8')
  const widget = readFileSync(new URL('A11yWidget.tsx', SRC), 'utf8')
  const focus = readFileSync(new URL('internal/focus.ts', SRC), 'utf8')
  const css = readFileSync(new URL('internal/style.ts', SRC), 'utf8')
  const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const toastCode = code(toast)

  check('touch "hover" never holds it: pointerenter/leave count only for a MOUSE',
    /onPointerEnter=\{\(e\) => \{ if \(e\.pointerType === 'mouse'\) setMouseOver\(true\) \}\}/.test(toastCode)
    && /onPointerLeave=\{\(e\) => \{ if \(e\.pointerType === 'mouse'\) setMouseOver\(false\) \}\}/.test(toastCode))
  check('focus holds it only if it is KEYBOARD focus (:focus-visible), recomputed on every focus change',
    /onFocus=\{\(e\) => setKeyboardFocus\(isKeyboardFocus\(e\.target as Element\)\)\}/.test(toastCode))
  check('the 1.1.0 behaviour — ANY focus holds it — is gone', !/setFocused\(true\)/.test(toastCode) && !/\bhovered\b/.test(toastCode))
  check('a press is released wherever the finger lets go (window listeners, cleaned up on unmount)',
    /addEventListener\('pointerup'/.test(toastCode) && /addEventListener\('pointercancel'/.test(toastCode)
    && /useEffect\(\(\) => \(\) => releasePress\.current\?\.\(\), \[\]\)/.test(toastCode))
  check('the isKeyboardFocus helper asks the browser (:focus-visible) and fails to "keyboard" where it cannot — the safe side',
    /matches\(':focus-visible'\)/.test(focus) && /catch \{\s*return true/.test(focus))
  check('hiding from the panel hands the toast focus ONLY to a keyboard visitor — what the README always promised',
    /focusToast: fromPanel && isKeyboardFocus\(active\)/.test(code(widget)))

  // The countdown.
  check('the toast shows a countdown ring on the close button, and the old 3px line is gone',
    /a11yw-toast-ring-fill/.test(toastCode) && !/a11yw-toast-timer/.test(toastCode) && !/a11yw-toast-timer/.test(css))
  const circumference = 2 * Math.PI * 19
  const dash = Number((css.match(/stroke-dasharray:\s*([\d.]+)/) || [])[1])
  const offset = Number((css.match(/to \{ stroke-dashoffset:\s*([\d.]+)/) || [])[1])
  check(`the ring's dash length matches its radius (2πr = ${circumference.toFixed(2)})`,
    Math.abs(dash - circumference) < 0.1 && Math.abs(offset - circumference) < 0.1, `dasharray ${dash}, end offset ${offset}`)
  check('the ring drains over exactly the toast\'s life, and freezes with the clock',
    /animation: a11yw-toast-ring var\(--a11yw-toast-ms, 5s\) linear forwards/.test(css)
    && /\.a11yw-toast\[data-paused='true'\] \.a11yw-toast-ring-fill \{ animation-play-state: paused; \}/.test(css)
    && /--a11yw-toast-ms/.test(toast))
  check('the ring is hidden — and the clock keeps running — under reduced motion and "Pause animations"',
    /prefers-reduced-motion: reduce\) \{[\s\S]*?\.a11yw-toast-ring \{ display: none; \}/.test(css)
    && /html\.a11y-motion-off \.a11yw-toast-ring \{ display: none; \}/.test(css))
}

// ── summary ────────────────────────────────────────────────────────────
console.log(`\n${pass} passed, ${failures.length} failed`)
if (failures.length) process.exit(1)
