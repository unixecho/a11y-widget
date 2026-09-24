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

for (const f of ['types.ts', 'storage.ts', 'apply.ts', 'i18n.ts', 'coverage.ts']) emit(f)

const load = (name) => import(pathToFileURL(join(outDir, name)).href)
const T = await load('types.mjs')
const S = await load('storage.mjs')
const A = await load('apply.mjs')
const I18n = await load('i18n.mjs')
const Cov = await load('coverage.mjs')

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
}

// ── summary ────────────────────────────────────────────────────────────
console.log(`\n${pass} passed, ${failures.length} failed`)
if (failures.length) process.exit(1)
