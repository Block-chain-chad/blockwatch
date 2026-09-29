import { describe, it, expect } from 'vitest'
import { classifyMeterKey, meterShortcutRows, isControl } from './meterKeys'

const press = (key, mods = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods })

describe('classifyMeterKey — the Board', () => {
  it('opens search on Ctrl+K only, never on a bare letter', () => {
    expect(classifyMeterKey(press('k', { ctrlKey: true }))).toEqual({ type: 'focusSearch' })
    expect(classifyMeterKey(press('k', { metaKey: true }), { mac: true })).toEqual({ type: 'focusSearch' })
    expect(classifyMeterKey(press('k', { metaKey: true }))).toBeNull()
    for (const l of 'nqxz') expect(classifyMeterKey(press(l))).toBeNull()
  })

  it('never opens an interval prompt on a digit', () => {
    for (const d of '0123456789') expect(classifyMeterKey(press(d))).toBeNull()
    expect(classifyMeterKey(press(','))).toBeNull()
  })

  it('steps, expands, collapses and selects', () => {
    expect(classifyMeterKey(press('ArrowDown'))).toEqual({ type: 'step', delta: 1 })
    expect(classifyMeterKey(press('ArrowUp'))).toEqual({ type: 'step', delta: -1 })
    expect(classifyMeterKey(press('ArrowRight'))).toEqual({ type: 'expand', open: true })
    expect(classifyMeterKey(press('ArrowLeft'))).toEqual({ type: 'expand', open: false })
    expect(classifyMeterKey(press('Enter'))).toEqual({ type: 'select' })
    expect(classifyMeterKey(press(' '))).toBeNull()
  })

  it('binds the guarded single keys W A C F ?', () => {
    expect(classifyMeterKey(press('w'))).toEqual({ type: 'watch' })
    expect(classifyMeterKey(press('W'))).toEqual({ type: 'watch' })
    expect(classifyMeterKey(press('a'))).toEqual({ type: 'alert' })
    expect(classifyMeterKey(press('c'))).toEqual({ type: 'chart' })
    expect(classifyMeterKey(press('f'))).toEqual({ type: 'fullscreen' })
    expect(classifyMeterKey(press('?', { shiftKey: true }))).toEqual({ type: 'shortcuts' })
    expect(classifyMeterKey(press('/', { ctrlKey: true }))).toBeNull()
  })

  it('binds I only inside a chart, and never L H M yet', () => {
    expect(classifyMeterKey(press('i'))).toBeNull()
    expect(classifyMeterKey(press('i'), { scope: 'chart' })).toEqual({ type: 'indicators' })
    for (const k of 'lhm') expect(classifyMeterKey(press(k), { scope: 'chart' })).toBeNull()
    expect(classifyMeterKey(press('ArrowDown'), { scope: 'chart' })).toBeNull()
    expect(classifyMeterKey(press('c'), { scope: 'chart' })).toBeNull()
  })

  it('leaves every modified key and every other key to the browser', () => {
    expect(classifyMeterKey(press('w', { ctrlKey: true }))).toBeNull()
    expect(classifyMeterKey(press('w', { altKey: true }))).toBeNull()
    expect(classifyMeterKey(press('W', { shiftKey: true }))).toBeNull()
    for (const k of ['Tab', 'Home', 'PageDown', '.', ';']) expect(classifyMeterKey(press(k))).toBeNull()
  })

  it('leaves Enter and the arrows to a focused control, but keeps the single keys', () => {
    const on = { control: true }
    expect(classifyMeterKey(press('Enter'), on)).toBeNull()
    expect(classifyMeterKey(press('ArrowDown'), on)).toBeNull()
    expect(classifyMeterKey(press('ArrowUp'), on)).toBeNull()
    expect(classifyMeterKey(press('ArrowRight'), on)).toBeNull()
    expect(classifyMeterKey(press('ArrowLeft'), on)).toBeNull()
    expect(classifyMeterKey(press('w'), on)).toEqual({ type: 'watch' })
    expect(classifyMeterKey(press('c'), on)).toEqual({ type: 'chart' })
    expect(classifyMeterKey(press('?', { shiftKey: true }), on)).toEqual({ type: 'shortcuts' })
    expect(classifyMeterKey(press('Escape'), on)).toEqual({ type: 'escape' })
    expect(classifyMeterKey(press('k', { ctrlKey: true }), on)).toEqual({ type: 'focusSearch' })
  })

  it('reports Esc outside a modal; inside a field only Esc; inside a modal nothing', () => {
    expect(classifyMeterKey(press('Escape'))).toEqual({ type: 'escape' })
    expect(classifyMeterKey(press('w'), { typing: true })).toBeNull()
    expect(classifyMeterKey(press('Escape'), { typing: true })).toEqual({ type: 'escape' })
    expect(classifyMeterKey(press('k', { ctrlKey: true }), { typing: true })).toBeNull()
    expect(classifyMeterKey(press('Escape'), { inModal: true })).toBeNull()
    expect(classifyMeterKey(press('w'), { inModal: true })).toBeNull()
  })
})

describe('isControl', () => {
  it('is a button, link or summary by tag, or by a control role', () => {
    expect(isControl({ tagName: 'BUTTON' })).toBe(true)
    expect(isControl({ tagName: 'a' })).toBe(true)
    expect(isControl({ tagName: 'SUMMARY' })).toBe(true)
    expect(isControl({ tagName: 'DIV', getAttribute: () => 'button' })).toBe(true)
    for (const role of ['option', 'tab', 'menuitem', 'link']) {
      expect(isControl({ tagName: 'DIV', getAttribute: () => role })).toBe(true)
    }
    expect(isControl({ tagName: 'DIV', getAttribute: () => null })).toBe(false)
    expect(isControl({ tagName: 'DIV', getAttribute: () => 'listbox' })).toBe(false)
    expect(isControl({ tagName: 'INPUT' })).toBe(false)
    expect(isControl(null)).toBe(false)
    expect(isControl(undefined)).toBe(false)
  })

  it("excepts the Board's own rows, which carry data-board-row", () => {
    const row = {
      tagName: 'DIV',
      dataset: { boardRow: '' },
      getAttribute: (n) => (n === 'role' ? 'button' : null),
      hasAttribute: (n) => n === 'data-board-row',
    }
    expect(isControl(row)).toBe(false)
    const plain = { tagName: 'DIV', getAttribute: () => 'button', hasAttribute: () => false }
    expect(isControl(plain)).toBe(true)
  })
})

describe('meterShortcutRows', () => {
  it('lists each binding once with the platform modifier', () => {
    const win = meterShortcutRows(false)
    const mac = meterShortcutRows(true)
    expect(win[0].keys).toEqual(['Ctrl', 'K'])
    expect(mac[0].keys).toEqual(['⌘', 'K'])
    expect(win.find((r) => r.action === 'Open the chart').keys).toEqual(['C'])
    expect(win.some((r) => r.action.includes('letter'))).toBe(false)
    expect(new Set(win.map((r) => r.action)).size).toBe(win.length)
  })
})

describe('meterShortcutRows copy', () => {
  it('calls each tokenized version a token, never a wrapper', async () => {
    const { meterShortcutRows } = await import('./meterKeys')
    const text = JSON.stringify(meterShortcutRows(false))
    expect(text).toContain("company's tokens")
    expect(text.toLowerCase()).not.toContain('wrapper')
  })
})
