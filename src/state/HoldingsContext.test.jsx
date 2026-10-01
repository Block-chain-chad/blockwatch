// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * Holdings storage and sync (brief sections 4 and 6; acceptance criteria 2,
 * 3, 4 and 19). The account side runs against an in-memory stand-in for the
 * user_holdings table that records every call, so each test can say exactly
 * what reached the server, and that a guest reached nothing at all.
 */

const h = vi.hoisted(() => ({ auth: { user: null, ready: true } }))
vi.mock('./AuthContext', () => ({ useAuth: () => h.auth }))
vi.mock('../services/analytics', () => ({ track: vi.fn() }))

// The table: rows per user, amounts kept as the strings they were sent as
// (Postgres numeric keeps every digit), and read back through the text cast.
const db = vi.hoisted(() => ({ rows: new Map(), calls: [], failRead: false, failWrite: false }))
vi.mock('../services/supabase', () => {
  const me = () => h.auth.user?.id
  const answer = (value) => ({ then: (ok, bad) => Promise.resolve(value).then(ok, bad) })
  const table = () => {
    if (!db.rows.has(me())) db.rows.set(me(), new Map())
    return db.rows.get(me())
  }
  return {
    supabase: {
      from(name) {
        return {
          select(cols) {
            db.calls.push(['select', name, cols])
            if (db.failRead) return answer({ data: null, error: { message: 'offline' } })
            return answer({
              data: [...table().values()].map((r) => ({ asset_id: r.asset_id, amount: String(r.amount), updated_at: r.updated_at })),
              error: null,
            })
          },
          delete() {
            const filter = { keep: null }
            const q = {
              eq: () => q,
              not: (col, op, list) => {
                filter.keep = list.slice(1, -1).split(',').map((s) => s.slice(1, -1))
                return q
              },
              then: (ok, bad) => {
                db.calls.push(['delete', name, filter.keep])
                if (db.failWrite) return Promise.resolve({ error: { message: 'no' } }).then(ok, bad)
                for (const id of [...table().keys()]) if (!filter.keep?.includes(id)) table().delete(id)
                return Promise.resolve({ error: null }).then(ok, bad)
              },
            }
            return q
          },
          upsert(rows) {
            db.calls.push(['upsert', name, rows])
            if (db.failWrite) return answer({ error: { message: 'no' } })
            for (const r of rows) table().set(r.asset_id, r)
            return answer({ error: null })
          },
        }
      },
    },
  }
})

const { HoldingsProvider, useHoldings } = await import('./HoldingsContext')
const { track } = await import('../services/analytics')

const A = { id: '11111111-1111-1111-1111-111111111111' }
const B = { id: '22222222-2222-2222-2222-222222222222' }
const GUEST = 'bw.holdings.v1'
const cacheKey = (u) => `bw.holdings.u.${u.id}`

let container
let root
let api

function Probe() {
  api = useHoldings()
  return null
}
function mount() {
  act(() =>
    root.render(
      <HoldingsProvider>
        <Probe />
      </HoldingsProvider>,
    ),
  )
}
/** Reload the page: a fresh provider over the same storage and server. */
function reload() {
  act(() => root.unmount())
  root = createRoot(container)
  mount()
}
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000)
  })
}
async function signIn(user) {
  h.auth = { user, ready: true }
  mount()
  await settle()
}
async function signOut() {
  h.auth = { user: null, ready: true }
  mount()
  await settle()
}
const list = () => api.holdings.map((x) => `${x.assetId}=${x.amount}`)
const serverRows = (u) => [...(db.rows.get(u.id)?.values() ?? [])].map((r) => `${r.asset_id}=${r.amount}`).sort()
const button = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent === label)
const text = () => document.body.textContent
const stored = (key) => JSON.parse(localStorage.getItem(key))

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  db.rows = new Map()
  db.calls = []
  db.failRead = false
  db.failWrite = false
  h.auth = { user: null, ready: true }
  track.mockClear()
  vi.stubGlobal('fetch', vi.fn())
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('guest (criterion 2)', () => {
  it('keeps holdings on this device, in the documented shape, and sends nothing anywhere', async () => {
    mount()
    await settle()
    expect(api.loaded).toBe(true)
    expect(api.signedIn).toBe(false)
    act(() => expect(api.add('nvidia-xstock', '10')).toBe('added'))
    expect(stored(GUEST)).toEqual([{ assetId: 'nvidia-xstock', amount: '10', updatedAt: expect.any(Number) }])
    reload()
    await settle()
    expect(list()).toEqual(['nvidia-xstock=10'])
    // No request of any kind carried the token or the amount: nothing at all
    // reached the network or the database.
    expect(fetch).not.toHaveBeenCalled()
    expect(db.calls).toEqual([])
    expect(track.mock.calls).toEqual([['holding_added', { source: 'typed' }]])
  })

  it('refuses a second copy of a token, and a 51st token', async () => {
    mount()
    await settle()
    act(() => api.add('a', '1'))
    act(() => expect(api.add('a', '2')).toBe('exists'))
    for (let i = 1; i < 50; i++) act(() => api.add(`t${i}`, '1'))
    act(() => expect(api.add('z', '1')).toBe('limit'))
    expect(api.holdings).toHaveLength(50)
  })

  it('removes at once, and Undo puts it back', async () => {
    mount()
    await settle()
    act(() => api.add('a', '1'))
    act(() => api.remove('a', 'Removed AAx'))
    expect(list()).toEqual([])
    expect(text()).toContain('Removed AAx')
    act(() => button('Undo').click())
    expect(list()).toEqual(['a=1'])
    expect(stored(GUEST)).toHaveLength(1)
    expect(track).toHaveBeenCalledWith('holding_removed')
  })
})

describe('signed in (criteria 3 and 19)', () => {
  it('syncs a change after 800 ms as one write, amounts as strings, and another device reads it', async () => {
    await signIn(A)
    act(() => api.add('a', '0.123456789012345678'))
    act(() => api.add('b', '2'))
    act(() => vi.advanceTimersByTime(700))
    expect(db.calls.filter(([op]) => op === 'upsert')).toHaveLength(0)
    await settle()
    const upserts = db.calls.filter(([op]) => op === 'upsert')
    expect(upserts).toHaveLength(1)
    expect(upserts[0][2].map((r) => [r.user_id, r.asset_id, r.amount])).toEqual([
      [A.id, 'a', '0.123456789012345678'],
      [A.id, 'b', '2'],
    ])
    // Another device: no cache, reads the account.
    localStorage.clear()
    reload()
    await settle()
    expect(list()).toEqual(['a=0.123456789012345678', 'b=2'])
    expect(db.calls.find(([op]) => op === 'select')[2]).toBe('asset_id,amount:amount::text,updated_at')
  })

  it('shows the account only: the guest copy stays hidden until sign-out', async () => {
    localStorage.setItem(GUEST, JSON.stringify([{ assetId: 'g', amount: '1', updatedAt: 1 }]))
    db.rows.set(A.id, new Map([['a', { asset_id: 'a', amount: '5', updated_at: '2026-09-30T00:00:00Z' }]]))
    await signIn(A)
    act(() => button('Keep on this device only').click())
    expect(list()).toEqual(['a=5'])
    await signOut()
    expect(list()).toEqual(['g=1'])
  })

  it('clears its cache on sign-out and on a session that expires', async () => {
    await signIn(A)
    act(() => api.add('a', '1'))
    await settle()
    expect(stored(cacheKey(A)).holdings).toHaveLength(1)
    await signOut()
    expect(localStorage.getItem(cacheKey(A))).toBeNull()
    // A cache left by a session that ended while the app was closed goes on load.
    localStorage.setItem(cacheKey(A), JSON.stringify({ holdings: [], pending: false, asked: true }))
    reload()
    await settle()
    expect(localStorage.getItem(cacheKey(A))).toBeNull()
  })

  it("never shows one account's holdings to another on the same device", async () => {
    await signIn(A)
    act(() => api.add('secret', '7'))
    await settle()
    await signIn(B)
    expect(list()).toEqual([])
    expect(localStorage.getItem(cacheKey(A))).toBeNull()
    expect(serverRows(B)).toEqual([])
  })

  it('keeps the cache and the server when the account cannot be read', async () => {
    await signIn(A)
    act(() => api.add('a', '1'))
    await settle()
    db.failRead = true
    db.calls = []
    reload()
    await settle()
    expect(list()).toEqual(['a=1'])
    expect(db.calls.filter(([op]) => op !== 'select')).toEqual([])
    expect(serverRows(A)).toEqual(['a=1'])
  })

  it('keeps a change the server never confirmed, and sends it on the next load', async () => {
    await signIn(A)
    db.failWrite = true
    act(() => api.add('a', '3'))
    await settle()
    expect(stored(cacheKey(A)).pending).toBe(true)
    db.failWrite = false
    reload()
    await settle()
    expect(list()).toEqual(['a=3'])
    expect(serverRows(A)).toEqual(['a=3'])
    expect(stored(cacheKey(A)).pending).toBe(false)
  })
})

describe('first sign-in with holdings on this device (criterion 4)', () => {
  beforeEach(() => {
    localStorage.setItem(
      GUEST,
      JSON.stringify([
        { assetId: 'a', amount: '9', updatedAt: 1 },
        { assetId: 'b', amount: '2', updatedAt: 1 },
        { assetId: 'c', amount: '3', updatedAt: 1 },
      ]),
    )
    db.rows.set(A.id, new Map([['a', { asset_id: 'a', amount: '1', updated_at: '2026-09-30T00:00:00Z' }]]))
  })

  it('asks once, in the approved words', async () => {
    await signIn(A)
    expect(text()).toContain(
      "Add the 3 holdings on this device to your account? They'll sync to your other devices. You can remove them at any time.",
    )
    expect(button('Add to my account')).toBeTruthy()
    expect(button('Keep on this device only')).toBeTruthy()
    // Nothing was uploaded by asking.
    expect(db.calls.filter(([op]) => op !== 'select')).toEqual([])
  })

  it("Add to my account: merges with the account's amount kept, says so once, then deletes the device copy", async () => {
    await signIn(A)
    await act(async () => button('Add to my account').click())
    await settle()
    expect(serverRows(A)).toEqual(['a=1', 'b=2', 'c=3'])
    expect(list().sort()).toEqual(['a=1', 'b=2', 'c=3'])
    expect(localStorage.getItem(GUEST)).toBeNull()
    expect(text()).toContain("1 holding was already in your account, so we kept the account's amount.")
    reload()
    await settle()
    expect(text()).not.toContain('Add the')
  })

  it('says nothing when no amount was skipped', async () => {
    db.rows = new Map()
    await signIn(A)
    await act(async () => button('Add to my account').click())
    await settle()
    expect(text()).not.toContain('already in your account')
  })

  it('keeps the device copy, says so once, and asks again when the write fails', async () => {
    await signIn(A)
    db.failWrite = true
    await act(async () => button('Add to my account').click())
    await settle()
    expect(stored(GUEST)).toHaveLength(3)
    expect(list()).toEqual(['a=1'])
    expect(stored(cacheKey(A)).pending).toBe(false)
    expect(text()).toContain(
      "We couldn't add the holdings on this device to your account. They're still on this device, and we'll ask again next time.",
    )
    db.failWrite = false
    const writes = db.calls.filter(([op]) => op !== 'select').length
    await settle()
    // No retry on its own.
    expect(db.calls.filter(([op]) => op !== 'select').length).toBe(writes)
    reload()
    await settle()
    expect(text()).toContain('Add the 3 holdings on this device to your account?')
  })

  it('a failed merge never overwrites a holding added on another device', async () => {
    await signIn(A)
    db.failWrite = true
    await act(async () => button('Add to my account').click())
    await settle()
    db.failWrite = false
    // Meanwhile, on another device:
    db.rows.get(A.id).set('elsewhere', { asset_id: 'elsewhere', amount: '4', updated_at: '2026-09-30T01:00:00Z' })
    reload()
    await settle()
    expect(serverRows(A)).toEqual(['a=1', 'elsewhere=4'])
    expect(list().sort()).toEqual(['a=1', 'elsewhere=4'])
  })

  it('Keep on this device only: uploads nothing, does not ask again this sign-in, and the copy returns after sign-out', async () => {
    await signIn(A)
    act(() => button('Keep on this device only').click())
    await settle()
    expect(db.calls.filter(([op]) => op !== 'select')).toEqual([])
    reload()
    await settle()
    expect(text()).not.toContain('Add the')
    await signOut()
    expect(list()).toEqual(['a=9', 'b=2', 'c=3'])
    // A new sign-in asks again.
    await signIn(A)
    expect(text()).toContain('Add the 3 holdings')
  })
})
