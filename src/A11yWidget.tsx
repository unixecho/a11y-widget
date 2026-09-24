'use client'

import { useEffect, useState } from 'react'
import A11yProvider, { useA11y } from './A11yProvider'
import A11yLauncher from './A11yLauncher'
import A11yPanel from './A11yPanel'
import ReadingGuide from './ReadingGuide'
import { DEFAULT_A11Y_CONFIG, type A11yWidgetConfig } from './types'

// The one import a host page needs. Mount as a sibling of the app's own
// `#a11y-scope` wrapper (both direct children of <body>) — see the
// package README's integration contract for exactly why.

export default function A11yWidget({ config = {} }: { config?: A11yWidgetConfig }) {
  return (
    <A11yProvider config={config}>
      <A11yWidgetInner config={config} />
    </A11yProvider>
  )
}

function A11yWidgetInner({ config }: { config: A11yWidgetConfig }) {
  const { prefs } = useA11y()
  const [open, setOpen] = useState(false)
  const corner = config.corner ?? DEFAULT_A11Y_CONFIG.corner

  // F2 opens/closes the panel — the same shortcut commercial accessibility
  // widgets use, so a visitor arriving from another site with the habit
  // already gets it here. Escape-to-close is the sheet's own job (A11ySheet);
  // this only ever needs to grant the initial open when the panel is closed
  // and the focus isn't inside an editable field (never hijack typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F2') return
      const active = document.activeElement
      const typing = active instanceof HTMLElement && (
        active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable
      )
      if (typing) return
      e.preventDefault()
      setOpen((prev) => !prev)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <A11yLauncher corner={corner} open={open} onOpen={() => setOpen(true)} />
      <A11yPanel open={open} onClose={() => setOpen(false)} />
      {prefs.readingGuide && <ReadingGuide />}
    </>
  )
}
