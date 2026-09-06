import { describe, it, expect } from 'vitest'
import { classifyKey, keyContext, isMacPlatform } from './desktopKeys'

const press = (key, mods = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
})

describe('classifyKey', () => {
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
  })

  it('toggles fullscreen on Shift+F only', () => {
    expect(classifyKey(press('F', { shiftKey: true }))).toEqual({ type: 'fullscreen' })
    expect(classifyKey(press('f', { shiftKey: true }))).toEqual({ type: 'fullscreen' })
    expect(classifyKey(press('f'))).toEqual({ type: 'focusSearch', prefill: 'f' })
    expect(classifyKey(press('F', { shiftKey: true, ctrlKey: true }))).toBeNull()
  })

  it('does not bind digits, punctuation or arrows (the chart map owns them)', () => {
    for (const key of ['1', ',', '/', 'ArrowDown', ' ', 'Enter', 'Tab']) {
      expect(classifyKey(press(key))).toBeNull()
    }
  })

  it('reports Esc so the shell can close the top-most thing', () => {
    expect(classifyKey(press('Escape'))).toEqual({ type: 'escape' })
  })

  it('inside a field only Esc gets through', () => {
    expect(classifyKey(press('n'), { typing: true })).toBeNull()
    expect(classifyKey(press('k', { ctrlKey: true }), { typing: true })).toBeNull()
    expect(classifyKey(press('F', { shiftKey: true }), { typing: true })).toBeNull()
    expect(classifyKey(press('Escape'), { typing: true })).toEqual({ type: 'escape' })
  })

  it('inside a Sheet nothing fires, Esc included — the sheet owns it', () => {
    expect(classifyKey(press('Escape'), { inModal: true })).toBeNull()
    expect(classifyKey(press('n'), { inModal: true })).toBeNull()
    expect(classifyKey(press('k', { ctrlKey: true }), { inModal: true })).toBeNull()
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
