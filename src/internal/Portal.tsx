'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Renders its children at the end of <body>, outside whatever markup the
// caller happens to sit in.
//
// This is what lets a fixed launcher/sheet actually behave like one. A
// `position: fixed` element is only positioned against the viewport while NO
// ancestor has a transform, filter or perspective — any of those silently
// turn that ancestor into the element's containing block. A host page's own
// entrance animation (most Next.js sites have one) is exactly this kind of
// ancestor, so anything left in the normal tree risks anchoring to the page
// instead of the screen.
//
// Renders nothing on the server: there is no document to portal into, and
// this widget's overlays are only ever opened by user interaction anyway.

export default function A11yPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}
