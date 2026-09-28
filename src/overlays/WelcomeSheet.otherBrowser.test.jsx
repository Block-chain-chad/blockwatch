// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * An emailed link opened in a different browser from the one that asked for
 * it cannot be redeemed there. Say so plainly and offer a new link, instead
 * of calling the link expired.
 */

vi.mock('../state/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../state/FoldersContext', () => ({ useFolders: () => ({ watchlistIds: [], folders: [] }) }))
vi.mock('../state/AlertsContext', () => ({ useAlerts: () => ({ rules: {} }) }))
vi.mock('../services/supabase', () => ({ supabase: null }))

const { default: WelcomeSheet } = await import('./WelcomeSheet')

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  document.body.innerHTML = ''
})

describe('WelcomeSheet other-browser variant', () => {
  it('explains the link and offers a new one', async () => {
    const onClose = vi.fn()
    const onOpenSignIn = vi.fn()
    await act(async () =>
      root.render(<WelcomeSheet variant="other-browser" onClose={onClose} onOpenSignIn={onOpenSignIn} />),
    )
    const text = document.body.textContent
    expect(text).toContain('Open the link where you asked for it')
    expect(text).toContain('only works in the browser that requested it')
    expect(text).not.toContain('—')
    const send = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Send a new link')
    await act(async () => send.click())
    expect(onClose).toHaveBeenCalled()
    expect(onOpenSignIn).toHaveBeenCalled()
  })
})
