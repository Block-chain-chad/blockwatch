/*
 * The keyboard half of a modal dialog, with no DOM in it so it can be tested
 * in plain node. The Sheet component measures the page — which elements can
 * take focus, which one has it — and asks this what a keypress should do.
 *
 * Escape always closes. Tab is only interesting at the edges: on the last
 * item it wraps to the first, and Shift+Tab on the first wraps to the last.
 * Anywhere in the middle the browser's own move already stays inside the
 * dialog, so the answer is "do nothing" and the default is left alone.
 *
 * activeIndex is -1 when focus is inside the dialog but not on a focusable
 * item (the panel itself takes focus on open so that keys reach the trap).
 * From there Tab goes to the first item and Shift+Tab to the last, which is
 * what a reader expects from "the dialog has focus".
 */

/** Everything a Tab keypress can land on, as the browser sees it. */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * @param {{ key: string, shiftKey?: boolean, activeIndex: number, count: number }} k
 * @returns {{ type: 'close' } | { type: 'focus', index: number } | { type: 'hold' } | null}
 *   null means the key is not ours and the browser should handle it.
 *   'hold' means prevent the default but move nothing — there is nowhere to go.
 */
export function trapKeyAction({ key, shiftKey = false, activeIndex, count }) {
  if (key === 'Escape') return { type: 'close' }
  if (key !== 'Tab') return null
  if (count <= 0) return { type: 'hold' }
  if (shiftKey) {
    return activeIndex <= 0 ? { type: 'focus', index: count - 1 } : null
  }
  return activeIndex < 0 || activeIndex >= count - 1 ? { type: 'focus', index: 0 } : null
}
