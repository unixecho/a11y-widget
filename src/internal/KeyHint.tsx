import { Fragment, type ReactNode } from 'react'
import { A11Y_SHORTCUT_KEY } from '../types'

// A translated string that mentions the shortcut carries a `{key}` placeholder
// (see i18n.ts) instead of a hardcoded "F2". This swaps each one for a <kbd>.
//
// The key is a placeholder, not literal text in three languages, for two
// reasons: it is named in exactly one place (A11Y_SHORTCUT_KEY), and the
// <kbd> is an isolated left-to-right run (see .a11yw-kbd), which is what keeps
// "F2" from reordering the words around it inside a Hebrew or Arabic sentence.
// A string with no placeholder passes through untouched.

export function withKey(text: string): ReactNode {
  const parts = text.split('{key}')
  if (parts.length === 1) return text
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <kbd className="a11yw-kbd">{A11Y_SHORTCUT_KEY}</kbd>}
      {part}
    </Fragment>
  ))
}
