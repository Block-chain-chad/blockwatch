// The Meter's key map (spec §3.4 #5), decided before any component acts on
// it. Pure so vitest can pin it. Nine guarded single keys plus chords; a
// single key fires only when focus is outside a field, and inside an open
// Sheet nothing fires at all — the sheet owns its keys. No letter opens
// search and no digit opens a prompt.
//
//   Ctrl+K (⌘K)     focus the search
//   ↓ / ↑           next / previous row on the Board
//   → / ←           expand / collapse the focused company
//   Enter           put the focused row in the Readout
//   W               watch or unwatch the focused wrapper
//   A               set an alert on the focused wrapper
//   C               open the chart for the selected wrapper
//   F               fullscreen (hide the masthead)
//   ?               the shortcut list
//   I               (inside a chart) the Indicators panel
//   Esc             close what is on top
//
// L, H and M (mark-up) are Plan C and are deliberately NOT bound here.

import { keyContext, isMacPlatform } from './desktopKeys'

export { keyContext, isMacPlatform }

const BOARD_SINGLE = { w: 'watch', a: 'alert', c: 'chart', f: 'fullscreen' }
const CHART_SINGLE = { i: 'indicators', f: 'fullscreen' }

export function classifyMeterKey(event, { mac = false, typing = false, inModal = false, scope = 'board' } = {}) {
  const key = event?.key ?? ''
  if (inModal) return null
  if (key === 'Escape') return { type: 'escape' }
  if (typing) return null

  const mod = mac ? event.metaKey === true : event.ctrlKey === true
  if (mod && !event.altKey && !event.shiftKey && key.toLowerCase() === 'k') return { type: 'focusSearch' }
  if (event.ctrlKey || event.metaKey || event.altKey) return null

  // '?' arrives with shiftKey on every layout that needs Shift for it.
  if (key === '?') return { type: 'shortcuts' }
  if (event.shiftKey) return null

  if (scope === 'chart') {
    const type = CHART_SINGLE[key.toLowerCase()]
    return type ? { type } : null
  }

  if (key === 'ArrowDown') return { type: 'step', delta: 1 }
  if (key === 'ArrowUp') return { type: 'step', delta: -1 }
  if (key === 'ArrowRight') return { type: 'expand', open: true }
  if (key === 'ArrowLeft') return { type: 'expand', open: false }
  if (key === 'Enter') return { type: 'select' }
  const type = BOARD_SINGLE[key.toLowerCase()]
  return type ? { type } : null
}

/** The rows the ? sheet shows, with the platform modifier already in place. */
export function meterShortcutRows(mac = false) {
  const mod = mac ? '⌘' : 'Ctrl'
  return [
    { keys: [mod, 'K'], action: 'Search tickers or companies' },
    { keys: ['↓', '↑'], action: 'Move down or up the Board' },
    { keys: ['→', '←'], action: 'Show or hide a company\'s wrappers' },
    { keys: ['Enter'], action: 'Read the focused row' },
    { keys: ['W'], action: 'Watch or unwatch' },
    { keys: ['A'], action: 'Set an alert' },
    { keys: ['C'], action: 'Open the chart' },
    { keys: ['I'], action: 'Indicators (in the chart)' },
    { keys: ['F'], action: 'Fullscreen' },
    { keys: ['Esc'], action: 'Close what is on top' },
    { keys: ['?'], action: 'This list' },
  ]
}
