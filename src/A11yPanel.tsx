'use client'

import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import A11ySheet from './internal/Sheet'
import { useA11y } from './A11yProvider'
import { a11yT, type A11yUiKey } from './i18n'
import { FONT_SCALE_STEPS, SPACING_STEPS, CONTRAST_MODES, QUICK_PROFILES, type ContrastMode, type Lang } from './types'

// The control sheet, reorganized into the same category shape a visitor
// already recognizes from commercial accessibility widgets: quick profiles
// first, then text, then color, then motion/tools — rather than one long
// undifferentiated list.
//
// Every control here is a plain <button>, never a native
// <input type="range">/<select> — a stepper/switch/radiogroup reads
// correctly with VoiceOver/TalkBack without a bespoke label dance a
// <select> would need.

const CONTRAST_LABEL_KEY: Record<ContrastMode, 'contrastDefault' | 'contrastHigh' | 'contrastGrayscale' | 'contrastInvert'> = {
  default: 'contrastDefault', high: 'contrastHigh', grayscale: 'contrastGrayscale', invert: 'contrastInvert',
}

const SPEECH_LANG: Record<Lang, string> = { he: 'he-IL', en: 'en-US', ar: 'ar-SA' }

export default function A11yPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, set, patch, reset, lang, dir, config } = useA11y()
  const t = useCallback((k: A11yUiKey) => a11yT(k, lang), [lang])
  const haptic = config.onHaptic ?? (() => {})
  const [announcement, setAnnouncement] = useState('')

  return (
    <A11ySheet open={open} onClose={onClose} label={t('title')} dir={dir}>
      <div className="a11yw-scroll" style={{ gap: 18, paddingTop: 6 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--a11y-text, var(--text, #f5f3ef))' }}>
            {t('title')}
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--a11y-text-dim, var(--text-dim, #a8a5b0))', lineHeight: 1.55 }}>
            {t('intro')}
          </p>
        </div>

        <div aria-live="polite" aria-atomic="true" className="a11yw-sr-only">{announcement}</div>

        <Section title={t('profilesSection')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {QUICK_PROFILES.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="a11yw-choice a11yw-press"
                style={{ textAlign: 'start', padding: '10px 12px' }}
                onClick={() => {
                  haptic('select')
                  patch(profile.patch)
                  setAnnouncement(`${profile.labels[lang]} — ${t('profileApplied')}`)
                }}
              >
                <span style={{ display: 'block', fontWeight: 700 }}>{profile.labels[lang]}</span>
                <span style={{ display: 'block', fontWeight: 400, fontSize: '0.78rem', opacity: 0.8, marginTop: 2 }}>
                  {profile.descriptions[lang]}
                </span>
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('textSection')}>
          <Stepper
            label={t('fontScale')}
            value={prefs.fontScale}
            max={FONT_SCALE_STEPS.length - 1}
            onChange={(v) => { haptic('tick'); set('fontScale', v as typeof prefs.fontScale) }}
            lang={lang}
          />
          <Stepper
            label={t('spacing')}
            value={prefs.spacing}
            max={SPACING_STEPS.length - 1}
            onChange={(v) => { haptic('tick'); set('spacing', v as typeof prefs.spacing) }}
            lang={lang}
          />
          <Switch label={t('readableFont')} checked={prefs.readableFont} onChange={(v) => { haptic('select'); set('readableFont', v) }} lang={lang} />
        </Section>

        <Section title={t('appearanceSection')}>
          <div role="radiogroup" aria-label={t('contrast')} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CONTRAST_MODES.map((mode) => {
              const active = prefs.contrast === mode
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className="a11yw-choice a11yw-press"
                  onClick={() => { haptic('select'); set('contrast', mode) }}
                >
                  {t(CONTRAST_LABEL_KEY[mode])}
                </button>
              )
            })}
          </div>
          <Switch label={t('hideImages')} checked={prefs.hideImages} onChange={(v) => { haptic('select'); set('hideImages', v) }} lang={lang} />
        </Section>

        <Section title={t('motionSection')}>
          <Switch label={t('pauseAnimations')} checked={prefs.pauseAnimations} onChange={(v) => { haptic('select'); set('pauseAnimations', v) }} lang={lang} />
          <Switch label={t('readingGuide')} checked={prefs.readingGuide} onChange={(v) => { haptic('select'); set('readingGuide', v) }} lang={lang} />
          <Switch label={t('highlightLinks')} checked={prefs.highlightLinks} onChange={(v) => { haptic('select'); set('highlightLinks', v) }} lang={lang} />
          <Switch label={t('highlightHeadings')} checked={prefs.highlightHeadings} onChange={(v) => { haptic('select'); set('highlightHeadings', v) }} lang={lang} />
          <Switch label={t('bigCursor')} checked={prefs.bigCursor} onChange={(v) => { haptic('select'); set('bigCursor', v) }} lang={lang} />
        </Section>

        <Section title={t('toolsSection')}>
          <ReadSelectionTool lang={lang} onAnnounce={setAnnouncement} />
        </Section>
      </div>

      <div style={{ paddingTop: 12, display: 'flex', gap: 8 }}>
        <button type="button" className="a11yw-btn-secondary a11yw-press" onClick={() => { haptic('tick'); reset() }} style={{ flex: 1 }}>
          {t('reset')}
        </button>
        <button type="button" className="a11yw-btn-primary a11yw-press" onClick={onClose} style={{ flex: 1 }}>
          {t('close')}
        </button>
      </div>
    </A11ySheet>
  )
}

/** Reads the current text selection aloud via the browser's native Web
 *  Speech API. Deliberately scoped to a selection, never "read the whole
 *  page" — this codebase's accessibility statement is explicit that the
 *  site has NOT been verified with a real screen reader, and a feature that
 *  silently implied screen-reader-equivalent coverage would contradict
 *  that. This is a modest, honestly-scoped convenience: read back
 *  whatever text a visitor has actually selected. Feature-detected — an
 *  unsupported browser sees no button at all, never a broken one. */
function ReadSelectionTool({ lang, onAnnounce }: { lang: Lang; onAnnounce: (msg: string) => void }) {
  const [speaking, setSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--a11y-text-faint, var(--text-faint, #908da0))' }}>{a11yT('readSelectionUnsupported', lang)}</p>
  }

  const stop = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  const readSelection = () => {
    const text = window.getSelection?.()?.toString().trim()
    if (!text) {
      onAnnounce(a11yT('readSelectionEmpty', lang))
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = SPEECH_LANG[lang]
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    utteranceRef.current = utterance
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <button
      type="button"
      className="a11yw-choice a11yw-press"
      style={{ width: '100%' }}
      onClick={speaking ? stop : readSelection}
    >
      {speaking ? a11yT('stopReading', lang) : a11yT('readSelection', lang)}
    </button>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <legend style={{ padding: 0, marginBottom: 4, fontSize: '0.78rem', fontWeight: 700, color: 'var(--a11y-text-faint, var(--text-faint, #908da0))' }}>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

/** −/value/+ stepper with a persistent aria-live span. */
function Stepper({
  label, value, max, onChange, lang,
}: {
  label: string; value: number; max: number; onChange: (v: number) => void; lang: Lang
}) {
  const dec = () => { if (value > 0) onChange(value - 1) }
  const inc = () => { if (value < max) onChange(value + 1) }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, rowGap: 6 }}>
      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--a11y-text, var(--text, #f5f3ef))', minWidth: 0 }}>{label}</span>
      <div className="a11yw-step" role="group" aria-label={label} style={{ flex: '0 0 auto' }}>
        <button type="button" className="a11yw-step-btn" onClick={dec} disabled={value === 0}
          aria-label={a11yT('decrease', lang)}>−</button>
        <span className="a11yw-step-qty" aria-live="polite" aria-atomic="true">{value + 1}</span>
        <button type="button" className="a11yw-step-btn" onClick={inc} disabled={value === max}
          aria-label={a11yT('increase', lang)}>+</button>
      </div>
    </div>
  )
}

/** A real `role="switch"`, not a checkbox styled to look like one. */
function Switch({
  label, checked, onChange, lang,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; lang: Lang
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="a11yw-press"
      onClick={() => onChange(!checked)}
      style={switchRow}
    >
      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--a11y-text, var(--text, #f5f3ef))', minWidth: 0 }}>{label}</span>
      {/* Both spans below are aria-hidden: role="switch" + aria-checked
          already gives assistive tech "switch, on/off" on their own; without
          this the two spans would concatenate into the accessible name with
          no separator. */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }} aria-hidden>
        <span style={{ fontSize: '0.74rem', color: 'var(--a11y-text-faint, var(--text-faint, #908da0))' }}>
          {checked ? a11yT('on', lang) : a11yT('off', lang)}
        </span>
        <span className="a11y-switch-track" data-on={checked}>
          <span className="a11y-switch-thumb" />
        </span>
      </span>
    </button>
  )
}

const switchRow: CSSProperties = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', width: '100%',
  gap: 12, rowGap: 6,
  border: 0, background: 'none', padding: '4px 0', cursor: 'pointer', fontFamily: 'inherit',
}
