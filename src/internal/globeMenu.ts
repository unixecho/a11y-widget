// Adding "Enable accessibility widget" to the menu the host's locale (globe)
// button opens.
//
// This is the one place the widget reaches into the host's markup, so it is
// built to be as little of an intrusion as that can be:
//   • it only exists while the widget is OFF — a visitor who has it on never
//     sees it;
//   • it only APPENDS two nodes (a separator and a menuitem) to the end of the
//     menu. It never edits, moves or removes anything of the host's, and React
//     only ever patches the nodes it created, so a host re-render cannot trip
//     over them; when the host removes the menu, ours goes with it;
//   • it carries its own class (styled in internal/style.ts) instead of copying
//     the host's look, so it cannot break when the host restyles;
//   • it is re-added whenever the host rebuilds the menu, and removed — leaving
//     the menu exactly as the host made it — when the widget is turned back on.
//
// How the menu is found, in order: the id in the button's `aria-controls`, then a
// `[role="menu"]` inside the button's own wrapper (both current hosts render the
// dropdown as the button's sibling).

export const GLOBE_ITEM_ATTR = 'data-a11yw-globe-item'

const ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="10"/><path d="M12 8v1M9 12h6M12 12v5"/></svg>'

export function findMenuFor(globe: HTMLElement): HTMLElement | null {
  const id = globe.getAttribute('aria-controls')
  const byId = id ? document.getElementById(id) : null
  if (byId) return byId
  const wrapper = globe.parentElement
  return wrapper ? wrapper.querySelector<HTMLElement>('[role="menu"]') : null
}

export interface GlobeItemOptions {
  label: string
  /** Called when the visitor picks the item. */
  onEnable: () => void
}

/** Keeps the item in the globe's menu until the returned cleanup is called. */
export function attachGlobeItem(globe: HTMLElement, { label, onEnable }: GlobeItemOptions): () => void {
  const scope = globe.parentElement ?? document.body

  const closeMenu = () => {
    // The hosts close their menu on Escape (and hand focus back to the globe,
    // which is where a keyboard visitor wants it). If one does not, toggling the
    // button is the other way every such menu closes.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    window.setTimeout(() => {
      if (globe.isConnected && globe.getAttribute('aria-expanded') === 'true') globe.click()
    }, 60)
  }

  const ensure = () => {
    const menu = findMenuFor(globe)
    if (!menu || menu.querySelector(`[${GLOBE_ITEM_ATTR}]`)) return

    const sep = document.createElement('div')
    sep.setAttribute('role', 'separator')
    sep.setAttribute(GLOBE_ITEM_ATTR, 'separator')
    sep.className = 'a11yw-globe-sep'

    const item = document.createElement('button')
    item.type = 'button'
    item.setAttribute('role', 'menuitem')
    item.setAttribute(GLOBE_ITEM_ATTR, 'item')
    item.className = 'a11yw-globe-item'
    item.innerHTML = ICON
    const text = document.createElement('span')
    text.textContent = label
    item.appendChild(text)
    item.addEventListener('click', (e) => {
      // Inside the host's wrapper, so its outside-click handler already leaves
      // it alone; stopping here keeps the click from reaching anything else.
      e.stopPropagation()
      onEnable()
      closeMenu()
    })

    menu.append(sep, item)
  }

  const mo = new MutationObserver(ensure)
  mo.observe(scope, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-expanded'] })
  ensure()

  return () => {
    mo.disconnect()
    scope.querySelectorAll(`[${GLOBE_ITEM_ATTR}]`).forEach((n) => n.remove())
  }
}
