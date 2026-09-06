import { describe, it, expect } from 'vitest'
import { trapKeyAction, FOCUSABLE_SELECTOR } from './focusTrap'

/*
 * The trap only ever has to make a decision at the edges of the dialog: on
 * the last item Tab must wrap, on the first Shift+Tab must wrap, and from
 * the panel itself (activeIndex -1) either direction must land on an item.
 * Everywhere else the browser is already right, so the contract is "null" —
 * a trap that preventDefaults every Tab breaks the native move and has to
 * reimplement it, which is how traps skip fields.
 */

const tab = (activeIndex, count, shiftKey = false) =>
  trapKeyAction({ key: 'Tab', shiftKey, activeIndex, count })

describe('trapKeyAction', () => {
  it('closes on Escape regardless of where focus is', () => {
    expect(trapKeyAction({ key: 'Escape', activeIndex: -1, count: 0 })).toEqual({ type: 'close' })
    expect(trapKeyAction({ key: 'Escape', activeIndex: 2, count: 5 })).toEqual({ type: 'close' })
  })

  it('ignores every other key', () => {
    for (const key of ['Enter', ' ', 'ArrowDown', 'a', 'Shift']) {
      expect(trapKeyAction({ key, activeIndex: 0, count: 3 })).toBeNull()
    }
  })

  it('wraps Tab from the last item to the first', () => {
    expect(tab(2, 3)).toEqual({ type: 'focus', index: 0 })
  })

  it('wraps Shift+Tab from the first item to the last', () => {
    expect(tab(0, 3, true)).toEqual({ type: 'focus', index: 2 })
  })

  it('leaves the browser alone in the middle of the list', () => {
    expect(tab(0, 3)).toBeNull()
    expect(tab(1, 3)).toBeNull()
    expect(tab(1, 3, true)).toBeNull()
    expect(tab(2, 3, true)).toBeNull()
  })

  it('enters the list from the panel itself in either direction', () => {
    expect(tab(-1, 4)).toEqual({ type: 'focus', index: 0 })
    expect(tab(-1, 4, true)).toEqual({ type: 'focus', index: 3 })
  })

  it('cycles on itself when there is exactly one item', () => {
    expect(tab(0, 1)).toEqual({ type: 'focus', index: 0 })
    expect(tab(0, 1, true)).toEqual({ type: 'focus', index: 0 })
  })

  it('holds focus where it is when nothing inside can take it', () => {
    expect(tab(-1, 0)).toEqual({ type: 'hold' })
    expect(tab(-1, 0, true)).toEqual({ type: 'hold' })
  })

  it('treats an index past the end as the last item rather than escaping', () => {
    // The list can shrink between measure and keypress (a button disables).
    expect(tab(7, 3)).toEqual({ type: 'focus', index: 0 })
  })

  it('never lets a tabindex=-1 container count as a stop', () => {
    expect(FOCUSABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])')
    expect(FOCUSABLE_SELECTOR).toContain('button:not([disabled])')
  })
})
