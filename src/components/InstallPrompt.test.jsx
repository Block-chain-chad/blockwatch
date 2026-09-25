// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * The Add to Home Screen row. Who qualifies is pinned in
 * lib/installPrompt.test.js; this file pins the behaviour around it: shown
 * once counted once, dismissed for good, and silent when storage throws.
 */

const track = vi.fn()
vi.mock('../services/analytics', () => ({ track: (...args) => track(...args) }))

let native = false
vi.mock('../lib/platform', () => ({ isNativeApp: () => native }))

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'

const { default: InstallPrompt } = await import('./InstallPrompt')

let container
let root
let store

// Own properties on the navigator instance shadow jsdom's, and are deleted
// after each test to uncover them again. jsdom has no maxTouchPoints at all.
const NAV_KEYS = ['userAgent', 'maxTouchPoints', 'standalone']

function stubBrowser({ userAgent = IPHONE_SAFARI, standalone = false } = {}) {
  const values = { userAgent, maxTouchPoints: 5, standalone }
  for (const k of NAV_KEYS) {
    Object.defineProperty(window.navigator, k, { value: values[k], configurable: true })
  }
  window.matchMedia = () => ({ matches: false })
}

function mount() {
  act(() => root.render(<InstallPrompt />))
}

const shown = () => container.textContent.includes('Add to Home Screen')

beforeEach(() => {
  track.mockClear()
  native = false
  store = {}
  vi.stubGlobal('localStorage', {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => delete store[k],
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  for (const k of NAV_KEYS) delete window.navigator[k]
  delete window.matchMedia
})

describe('InstallPrompt', () => {
  it('shows on iPhone Safari and counts the showing once', () => {
    stubBrowser()
    mount()
    mount() // a re-render is not a second showing
    expect(shown()).toBe(true)
    expect(container.textContent).toContain('tap Share')
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('install_prompt_shown')
  })

  it('stays gone once dismissed, across a reload', () => {
    stubBrowser()
    mount()
    act(() => container.querySelector('button[aria-label="Dismiss tip"]').click())
    expect(shown()).toBe(false)
    expect(track).toHaveBeenLastCalledWith('install_prompt_dismissed')
    expect(track).toHaveBeenCalledTimes(2)

    act(() => root.unmount())
    root = createRoot(container)
    track.mockClear()
    mount()
    expect(shown()).toBe(false)
    expect(track).not.toHaveBeenCalled()
  })

  it('renders nothing when already on the Home Screen', () => {
    stubBrowser({ standalone: true })
    mount()
    expect(shown()).toBe(false)
    expect(track).not.toHaveBeenCalled()
  })

  it('renders nothing in the native app', () => {
    native = true
    stubBrowser()
    mount()
    expect(shown()).toBe(false)
  })

  it('renders nothing on Android', () => {
    stubBrowser({ userAgent: ANDROID_CHROME })
    mount()
    expect(shown()).toBe(false)
  })

  it('renders nothing, and does not throw, when storage is blocked', () => {
    stubBrowser()
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    mount()
    expect(shown()).toBe(false)
  })

  it('still hides on dismiss when storage cannot be written', () => {
    stubBrowser()
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('full')
      },
    })
    mount()
    act(() => container.querySelector('button[aria-label="Dismiss tip"]').click())
    expect(shown()).toBe(false)
  })
})
