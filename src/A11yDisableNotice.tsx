'use client'

import A11ySheet from './internal/Sheet'
import { withKey } from './internal/KeyHint'
import { useA11y } from './A11yProvider'
import { a11yT } from './i18n'

// The modal shown once the visitor has turned the widget off: what just
// happened, and exactly how to undo it — through the globe button, the one
// place that is on every page of both hosts.
//
// It is opened by A11yWidget only after the launcher's outro AND the page's own
// animations have finished (internal/settle.ts), so it never lands on top of a
// load-in. It reuses the widget's own sheet — focus trap, Escape, scrim — so it
// behaves like the panel it follows.
//
// The picture is a miniature of what the visitor is about to do: the globe, and
// the menu it opens with the "enable" item lit. Decorative (aria-hidden) — the
// two numbered steps say the same thing in words.

export interface A11yDisableNoticeProps {
  open: boolean
  /** "Got it", Escape, or a click on the scrim. */
  onClose: () => void
  /** "Undo" — turn the widget straight back on. */
  onUndo: () => void
}

export default function A11yDisableNotice({ open, onClose, onUndo }: A11yDisableNoticeProps) {
  const { lang, dir } = useA11y()
  const t = (k: Parameters<typeof a11yT>[0]) => a11yT(k, lang)

  return (
    <A11ySheet open={open} onClose={onClose} label={t('noticeTitle')} dir={dir} restoreFocus={false}>
      <div className="a11yw-notice">
        <div className="a11yw-notice-art" aria-hidden>
          <span className="a11yw-notice-globe">
            <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor"
              strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M3 12h18" />
              <path d="M12 3c2.5 2.5 3.8 5.8 3.8 9S14.5 18.5 12 21C9.5 18.5 8.2 15.2 8.2 12S9.5 5.5 12 3z" />
            </svg>
          </span>
          <span className="a11yw-notice-menu">
            <span className="a11yw-notice-row" />
            <span className="a11yw-notice-row" />
            <span className="a11yw-notice-row a11yw-notice-row-on">
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor"
                strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v1M9 12h6M12 12v5" />
              </svg>
              <span className="a11yw-notice-row-text">{t('enableItem')}</span>
            </span>
          </span>
        </div>

        <h2 className="a11yw-notice-title">{t('noticeTitle')}</h2>
        <p className="a11yw-notice-body">{t('noticeBody')}</p>

        {/* role="list": list-style:none strips the list from some screen readers. */}
        <ol className="a11yw-notice-steps" role="list">
          <li><span className="a11yw-notice-n" aria-hidden>1</span><span>{t('noticeStep1')}</span></li>
          <li><span className="a11yw-notice-n" aria-hidden>2</span><span>{t('noticeStep2')}</span></li>
        </ol>

        <p className="a11yw-notice-note a11yw-notice-keyhint">{withKey(t('noticeKeyHint'))}</p>
        <p className="a11yw-notice-note">{t('noticeSettings')}</p>

        <div className="a11yw-notice-actions">
          {/* "Got it" comes first so it is the sheet's initial focus: a keyboard
              visitor who turned the widget off with Enter and presses Enter again
              must not land on Undo. */}
          <button type="button" className="a11yw-btn-primary a11yw-press" onClick={onClose}>
            {t('noticeGotIt')}
          </button>
          <button type="button" className="a11yw-btn-secondary a11yw-press" onClick={onUndo}>
            {t('noticeUndo')}
          </button>
        </div>
      </div>
    </A11ySheet>
  )
}
