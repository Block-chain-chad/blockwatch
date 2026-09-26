// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/* Settings > Face ID and passkeys: lists, removes, adds. */

const h = vi.hoisted(() => ({ list: vi.fn(), remove: vi.fn(), register: vi.fn() }))
vi.mock('../services/passkeys', async (importOriginal) => ({
  ...(await importOriginal()),
  listPasskeys: (...a) => h.list(...a),
  removePasskey: (...a) => h.remove(...a),
  registerPasskey: (...a) => h.register(...a),
}))
vi.mock('../services/supabase', () => ({ supabase: null }))

const { default: PasskeysSheet } = await import('./PasskeysSheet')

let container
let root
const text = () => document.body.textContent
const button = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent === label)

async function mount() {
  await act(async () => root.render(<PasskeysSheet onClose={() => {}} />))
}

beforeEach(() => {
  h.list.mockReset().mockResolvedValue([
    { id: 'pk-1', friendly_name: 'iPhone', created_at: '2026-09-20T10:00:00Z', last_used_at: '2026-09-24T10:00:00Z' },
  ])
  h.remove.mockReset().mockResolvedValue()
  h.register.mockReset().mockResolvedValue({ id: 'pk-2' })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('PasskeysSheet', () => {
  it('lists the passkeys with when they were added and used', async () => {
    await mount()
    expect(text()).toContain('iPhone')
    expect(text()).toContain('Added Sep 20, 2026 · last used Sep 24, 2026')
  })

  it('removes one and reloads the list', async () => {
    await mount()
    h.list.mockResolvedValue([])
    await act(async () => button('Remove').click())
    expect(h.remove).toHaveBeenCalledWith('pk-1')
    expect(text()).toContain('No passkeys yet.')
  })

  it('adds one on this device', async () => {
    await mount()
    const add = [...document.querySelectorAll('button')].find((b) => b.textContent.startsWith('Add '))
    await act(async () => add.click())
    expect(h.register).toHaveBeenCalled()
    expect(h.list).toHaveBeenCalledTimes(2)
  })

  it('says nothing when the person dismisses the prompt, and explains a real failure', async () => {
    await mount()
    const add = () => [...document.querySelectorAll('button')].find((b) => b.textContent.startsWith('Add '))
    h.register.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
    await act(async () => add().click())
    expect(text()).not.toContain("Couldn't add")
    h.register.mockRejectedValueOnce(new Error('server said no'))
    await act(async () => add().click())
    expect(text()).toContain("Couldn't add a passkey")
  })
})
