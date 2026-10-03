// Is this focus a KEYBOARD user's, or did something merely move it there?
//
// `:focus-visible` is the browser's own answer: it matches when the visitor
// got there by keyboard, and does NOT match when focus was moved by script
// after a tap or a click — which is precisely the case the toast must not
// treat as "the visitor is reading me, hold the clock". (Found live,
// 2026-10-03: hiding the button from the panel handed the toast focus by script
// after a TAP, the toast read that as keyboard engagement, and froze its own
// timer — it never closed until the visitor hit the X.)
//
// A browser too old to know `:focus-visible` throws on the selector; failing
// to "yes, keyboard" there is the safe side — a visitor who needs more time
// gets it, and the worst case is a toast that waits to be dismissed, the
// behaviour 1.1.0 had for everyone.
export function isKeyboardFocus(el: Element | null | undefined): boolean {
  if (!el) return false
  try {
    return el.matches(':focus-visible')
  } catch {
    return true
  }
}
