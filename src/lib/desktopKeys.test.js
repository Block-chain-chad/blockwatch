import { describe, it, expect } from 'vitest'
import { classifyKey, keyContext, isMacPlatform, shortcutRows } from './desktopKeys'

const press = (key, mods = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
})

describe('classifyKey — search', () => {
  it('opens the search on Ctrl+K, with nothing typed', () => {
    expect(classifyKey(press('k', { ctrlKey: true }))).toEqual({ type: 'focusSearch', prefill: '' })
    expect(classifyKey(press('K', { ctrlKey: true }))).toEqual({ type: 'focusSearch', prefill: '' })
  })

  it('uses ⌘ instead of Ctrl on a Mac', () => {
    expect(classifyKey(press('k', { metaKey: true }), { mac: true })).toEqual({
      type: 'focusSearch',
      prefill: '',
    })
    expect(classifyKey(press('k', { ctrlKey: true }), { mac: true })).toBeNull()
    expect(classifyKey(press('k', { metaKey: true }), { mac: false })).toBeNull()
  })

  it('opens the search on any bare letter with that letter typed', () => {
    for (const letter of 'abcnz') {
      expect(classifyKey(press(letter))).toEqual({ type: 'focusSearch', prefill: letter })
    }
  })

  it('leaves modified letters alone (browser and OS shortcuts)', () => {
    expect(classifyKey(press('n', { ctrlKey: true }))).toBeNull()
    expect(classifyKey(press('n', { altKey: true }))).toBeNull()
    expect(classifyKey(press('N', { shiftKey: true }))).toBeNull()
    expect(classifyKey(press('k', { ctrlKey: true, shiftKey: true }))).toBeNull()
    expect(classifyKey(press('k', { ctrlKey: true, altKey: true }))).toBeNull()
  })
})

describe('classifyKey — the chart map', () => {
  it('opens the interval prompt on a bare digit with the digit, and on , with nothing', () => {
    for (const d of '0123456789') {
      expect(classifyKey(press(d))).toEqual({ type: 'interval', prefill: d })
    }
    expect(classifyKey(press(','))).toEqual({ type: 'interval', prefill: '' })
  })

  it('does not bind modified digits', () => {
    expect(classifyKey(press('1', { ctrlKey: true }))).toBeNull()
    expect(classifyKey(press('1', { altKey: true }))).toBeNull()
    expect(classifyKey(press('!', { shiftKey: true }))).toBeNull()
  })

  it('focuses the indicators on a bare /', () => {
    expect(classifyKey(press('/'))).toEqual({ type: 'indicators' })
  })

  it('steps the list on ↓ / Space and ↑ / Shift+Space', () => {
    expect(classifyKey(press('ArrowDown'))).toEqual({ type: 'step', delta: 1 })
    expect(classifyKey(press(' '))).toEqual({ type: 'step', delta: 1 })
    expect(classifyKey(press('ArrowUp'))).toEqual({ type: 'step', delta: -1 })
    expect(classifyKey(press(' ', { shiftKey: true }))).toEqual({ type: 'step', delta: -1 })
    expect(classifyKey(press('ArrowDown', { ctrlKey: true }))).toBeNull()
    expect(classifyKey(press('ArrowLeft'))).toBeNull()
  })

  it('binds Alt+W / A / R / L and nothing else on Alt', () => {
    expect(classifyKey(press('w', { altKey: true }))).toEqual({ type: 'watchlist' })
    expect(classifyKey(press('W', { altKey: true }))).toEqual({ type: 'watchlist' })
    expect(classifyKey(press('a', { altKey: true }))).toEqual({ type: 'alert' })
    expect(classifyKey(press('r', { altKey: true }))).toEqual({ type: 'reset' })
    expect(classifyKey(press('l', { altKey: true }))).toEqual({ type: 'log' })
    // Phase 2/3 hotkeys must not be bound yet: Alt+G, Alt+S, Alt+H, Alt+T…
    for (const k of 'gshtjv') expect(classifyKey(press(k, { altKey: true }))).toBeNull()
    expect(classifyKey(press('r', { altKey: true, shiftKey: true }))).toBeNull()
    expect(classifyKey(press('r', { altKey: true, ctrlKey: true }))).toBeNull()
  })

  it('opens the shortcut sheet on Ctrl+/ (⌘/ on a Mac)', () => {
    expect(classifyKey(press('/', { ctrlKey: true }))).toEqual({ type: 'shortcuts' })
    expect(classifyKey(press('/', { metaKey: true }), { mac: true })).toEqual({ type: 'shortcuts' })
    expect(classifyKey(press('/', { metaKey: true }))).toBeNull()
  })

  it('toggles fullscreen on Shift+F only', () => {
    expect(classifyKey(press('F', { shiftKey: true }))).toEqual({ type: 'fullscreen' })
    expect(classifyKey(press('f', { shiftKey: true }))).toEqual({ type: 'fullscreen' })
    expect(classifyKey(press('f'))).toEqual({ type: 'focusSearch', prefill: 'f' })
    expect(classifyKey(press('F', { shiftKey: true, ctrlKey: true }))).toBeNull()
  })

  it('leaves Enter, Tab and other punctuation to the browser', () => {
    for (const key of ['Enter', 'Tab', '.', ';', '[', 'Home', 'PageDown']) {
      expect(classifyKey(press(key))).toBeNull()
    }
  })

  it('reports Esc so the shell can close the top-most thing', () => {
    expect(classifyKey(press('Escape'))).toEqual({ type: 'escape' })
  })
})

describe('classifyKey — where focus is', () => {
  it('inside a field only Esc gets through', () => {
    expect(classifyKey(press('n'), { typing: true })).toBeNull()
    expect(classifyKey(press('5'), { typing: true })).toBeNull()
    expect(classifyKey(press(' '), { typing: true })).toBeNull()
    expect(classifyKey(press('k', { ctrlKey: true }), { typing: true })).toBeNull()
    expect(classifyKey(press('F', { shiftKey: true }), { typing: true })).toBeNull()
    expect(classifyKey(press('Escape'), { typing: true })).toEqual({ type: 'escape' })
  })

  it('inside a Sheet nothing fires, Esc included — the sheet owns it', () => {
    expect(classifyKey(press('Escape'), { inModal: true })).toBeNull()
    expect(classifyKey(press('n'), { inModal: true })).toBeNull()
    expect(classifyKey(press('k', { ctrlKey: true }), { inModal: true })).toBeNull()
    expect(classifyKey(press('/', { ctrlKey: true }), { inModal: true })).toBeNull()
  })
})

describe('keyContext', () => {
  const el = (tagName, extra = {}) => ({ tagName, closest: () => null, ...extra })

  it('treats inputs, textareas, selects and contenteditable as typing', () => {
    expect(keyContext(el('INPUT')).typing).toBe(true)
    expect(keyContext(el('textarea')).typing).toBe(true)
    expect(keyContext(el('SELECT')).typing).toBe(true)
    expect(keyContext(el('DIV', { isContentEditable: true })).typing).toBe(true)
    expect(keyContext(el('BUTTON')).typing).toBe(false)
    expect(keyContext(el('DIV')).typing).toBe(false)
  })

  it('detects an open sheet above the target', () => {
    const inside = el('BUTTON', { closest: (sel) => (sel === '[aria-modal="true"]' ? {} : null) })
    expect(keyContext(inside)).toEqual({ typing: false, inModal: true })
    expect(keyContext(el('BUTTON')).inModal).toBe(false)
  })

  it('survives a missing or odd target', () => {
    expect(keyContext(null)).toEqual({ typing: false, inModal: false })
    expect(keyContext(undefined)).toEqual({ typing: false, inModal: false })
    expect(keyContext({})).toEqual({ typing: false, inModal: false })
  })
})

describe('isMacPlatform', () => {
  it('reads platform, preferring userAgentData', () => {
    expect(isMacPlatform({ platform: 'MacIntel' })).toBe(true)
    expect(isMacPlatform({ userAgentData: { platform: 'macOS' } })).toBe(true)
    expect(isMacPlatform({ platform: 'Win32' })).toBe(false)
    expect(isMacPlatform({ userAgentData: { platform: 'Windows' }, platform: 'MacIntel' })).toBe(false)
    expect(isMacPlatform({})).toBe(false)
  })
})

describe('shortcutRows', () => {
  it('lists every binding once with the platform modifier', () => {
    const win = shortcutRows(false)
    const mac = shortcutRows(true)
    expect(win).toHaveLength(13)
    expect(mac).toHaveLength(13)
    expect(win[0].keys).toEqual(['Ctrl', 'K'])
    expect(mac[0].keys).toEqual(['⌘', 'K'])
    expect(win.find((r) => r.action === 'Reset chart view').keys).toEqual(['Alt', 'R'])
    expect(win.find((r) => r.action === 'Fullscreen mode').keys).toEqual(['Shift', 'F'])
    expect(new Set(win.map((r) => r.action)).size).toBe(win.length)
  })
})
