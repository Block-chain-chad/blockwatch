// What a key press means on the desktop shell, decided before any component
// acts on it. Pure so the map is testable: the shell hands in the event's
// key/modifier fields plus where focus was, and gets back an action or null.
//
// The whole Phase-1 map (spec §6.10) lives in this one table, so two keys can
// never mean two things:
//
//   Ctrl+K (⌘K)         focus the symbol search
//   a–z                 focus the search with that letter typed
//   0–9 or ,            open the interval prompt (with the digit; empty for ,)
//   /                   focus the first indicator chip (Candles mode)
//   ↓ / Space           next symbol in the right-column list
//   ↑ / Shift+Space     previous symbol
//   Alt+W               toggle the selected asset in the watchlist
//   Alt+A               open Set alert for the selected asset
//   Alt+R               reset the chart view (Candles mode)
//   Alt+L               toggle the log scale (Candles mode)
//   Shift+F             toggle fullscreen
//   Esc                 close the top-most thing (popover, prompt, fullscreen)
//   Ctrl+/ (⌘/)         open the shortcut sheet
//
// Alt+G, Alt+S, the drawing and the trading hotkeys are Phase 2 and 3 and
// are deliberately NOT here. Fields keep their keys (only Esc gets through);
// an open Sheet owns everything, Esc included.

const ALT_ACTIONS = { w: 'watchlist', a: 'alert', r: 'reset', l: 'log' }

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
 *   { type: 'interval', prefill: '5' }     a bare digit ('' for ,)
 *   { type: 'indicators' }                 /
 *   { type: 'step', delta: 1 | -1 }        ↓ / Space, ↑ / Shift+Space
 *   { type: 'watchlist' | 'alert' | 'reset' | 'log' }   Alt+W / A / R / L
 *   { type: 'fullscreen' }                 Shift+F
 *   { type: 'escape' }                     Esc, outside a modal
 *   { type: 'shortcuts' }                  Ctrl+/ (⌘/ on a Mac)
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
  const plainMod = mod && !event.altKey && !event.shiftKey
  if (plainMod && key.toLowerCase() === 'k') return { type: 'focusSearch', prefill: '' }
  if (plainMod && key === '/') return { type: 'shortcuts' }

  // Alt+letter chords; Alt with Ctrl/⌘ or Shift belongs to the browser.
  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    const type = ALT_ACTIONS[key.toLowerCase()]
    return type ? { type } : null
  }
  // Any other chord belongs to the browser or the OS, whichever key is the
  // modifier on this platform.
  if (event.ctrlKey || event.metaKey || event.altKey) return null

  if (event.shiftKey) {
    // Shift+F: browsers report the key as 'F', automation often as 'f'.
    if (key.toLowerCase() === 'f') return { type: 'fullscreen' }
    if (key === ' ') return { type: 'step', delta: -1 }
    return null
  }
  if (key === 'ArrowDown' || key === ' ') return { type: 'step', delta: 1 }
  if (key === 'ArrowUp') return { type: 'step', delta: -1 }
  if (key === '/') return { type: 'indicators' }
  if (/^[0-9]$/.test(key)) return { type: 'interval', prefill: key }
  if (key === ',') return { type: 'interval', prefill: '' }
  if (/^[a-z]$/.test(key)) return { type: 'focusSearch', prefill: key }
  return null
}

/**
 * The shortcut list the Ctrl+/ sheet shows and the toolbar tooltips quote,
 * with the platform's modifier already in place. Each row is
 * { keys: string[], action: string }.
 */
export function shortcutRows(mac = false) {
  const mod = mac ? '⌘' : 'Ctrl'
  return [
    { keys: [mod, 'K'], action: 'Symbol search' },
    { keys: ['A – Z'], action: 'Search with that letter typed' },
    { keys: ['0 – 9', ','], action: 'Type an interval' },
    { keys: ['/'], action: 'Indicators (Candles mode)' },
    { keys: ['↓', 'Space'], action: 'Next symbol in the list' },
    { keys: ['↑', 'Shift + Space'], action: 'Previous symbol in the list' },
    { keys: ['Alt', 'W'], action: 'Add to or remove from watchlist' },
    { keys: ['Alt', 'A'], action: 'Set alert' },
    { keys: ['Alt', 'R'], action: 'Reset chart view' },
    { keys: ['Alt', 'L'], action: 'Logarithmic scale' },
    { keys: ['Shift', 'F'], action: 'Fullscreen mode' },
    { keys: ['Esc'], action: 'Close what is on top' },
    { keys: [mod, '/'], action: 'This list' },
  ]
}
