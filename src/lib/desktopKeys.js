// What a key press means on the desktop shell, decided before any component
// acts on it. Pure so the map is testable: the shell hands in the event's
// key/modifier fields plus where focus was, and gets back an action or null.
//
// Phase-1 bindings that belong to the shell itself (spec §6.10): Ctrl+K and
// any bare letter open the symbol search, Shift+F toggles fullscreen, Esc
// closes whatever is on top. The chart bindings (digits and `,` for the
// interval prompt, `/`, ↓/↑/Space, Alt+W/A/R/L, Ctrl+/) extend this same
// table — one place, so two keys can never mean two things.

const MOD_ALT_OR_SHIFT = (e) => e.altKey || e.shiftKey

/**
 * Where a key landed. `typing` — a field owns the key (an input, textarea,
 * select or contenteditable); `inModal` — a Sheet is open under the target,
 * and Sheet owns every key including Esc.
 */
export function keyContext(target) {
  if (!target || typeof target !== 'object') return { typing: false, inModal: false }
  const tag = String(target.tagName ?? '').toUpperCase()
  const typing =
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true
  const inModal =
    typeof target.closest === 'function' && target.closest('[aria-modal="true"]') != null
  return { typing, inModal }
}

/** macOS uses ⌘ where Windows and Linux use Ctrl. */
export function isMacPlatform(nav) {
  const n = nav ?? (typeof navigator !== 'undefined' ? navigator : null)
  const platform = n?.userAgentData?.platform ?? n?.platform ?? ''
  return /^mac/i.test(platform)
}

/**
 * classifyKey(event, { mac, typing, inModal }) → action | null
 *
 *   { type: 'focusSearch', prefill: '' }   Ctrl+K (⌘K on a Mac)
 *   { type: 'focusSearch', prefill: 'n' }  a bare letter, that letter typed
 *   { type: 'fullscreen' }                 Shift+F
 *   { type: 'escape' }                     Esc, outside a modal
 *
 * Inside a modal nothing fires; inside a field only Esc does. `event` need
 * only carry key, ctrlKey, metaKey, altKey and shiftKey.
 */
export function classifyKey(event, { mac = false, typing = false, inModal = false } = {}) {
  const key = event?.key ?? ''
  if (inModal) return null
  if (key === 'Escape') return { type: 'escape' }
  if (typing) return null

  const mod = mac ? event.metaKey === true : event.ctrlKey === true
  if (mod && !MOD_ALT_OR_SHIFT(event) && key.toLowerCase() === 'k') {
    return { type: 'focusSearch', prefill: '' }
  }
  // Any other chord belongs to the browser or the OS, whichever key is the
  // modifier on this platform.
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  // Shift+F: browsers report the key as 'F', automation often as 'f'.
  if (event.shiftKey) return key.toLowerCase() === 'f' ? { type: 'fullscreen' } : null
  if (/^[a-z]$/.test(key)) return { type: 'focusSearch', prefill: key }
  return null
}
