'use client'

import A11yPortal from './internal/Portal'
import { useA11y } from './A11yProvider'
import { a11yT } from './i18n'
import type { A11yCorner } from './types'

// The trigger button. Portalled to <body>: any ancestor with an active
// `transform` (a common page-entrance-animation pattern) would silently
// become this button's containing block, resolving `position: fixed`
// against the page instead of the viewport.
//
// `corner` is a physical value, never logical start/end — fixed chrome
// stays in the same physical corner regardless of text direction.

const CORNER_CLASS: Record<A11yCorner, string> = {
  'top-left': 'a11y-fab-tl',
  'top-right': 'a11y-fab-tr',
  'bottom-left': 'a11y-fab-bl',
  'bottom-right': 'a11y-fab-br',
}

export default function A11yLauncher({
  corner, open, onOpen,
}: {
  corner: A11yCorner
  open: boolean
  onOpen: () => void
}) {
  const { lang } = useA11y()

  return (
    <A11yPortal>
      <button
        type="button"
        className={`a11y-fab ${CORNER_CLASS[corner]} a11yw-press`}
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={a11yT('openLabel', lang)}
      >
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor"
          strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v1M9 12h6M12 12v5" />
        </svg>
      </button>
    </A11yPortal>
  )
}
