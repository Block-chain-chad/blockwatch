// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * A folder or alert the account refused is "still saved on this device", so
 * a reload must not lose it. The account's rows load first, then this
 * device's copy of every row that never reached the account is put back.
 */

const REFUSED = { code: '23514', message: 'check constraint' }

// A tiny stand-in for the two Supabase tables: rows the database accepted,
// and a rule for which rows it refuses.
const db = vi.hoisted(() => ({ tables: { user_folders: [], user_alerts: [] }, refuse: () => false }))
vi.mock('../services/supabase', () => {
  const key = (table) => (table === 'user_folders' ? 'id' : 'asset_id')
  return {
    supabase: {
      from(table) {
        const write = (rows) => {
          const list = Array.isArray(rows) ? rows : [rows]
          if (list.some((r) => db.refuse(table, r))) return Promise.resolve({ error: REFUSED })
          for (const r of list) {
            db.tables[table] = db.tables[table].filter((x) => x[key(table)] !== r[key(table)]).concat(r)
          }
          return Promise.resolve({ error: null })
        }
        const query = { eq: () => query, not: () => query, then: (ok, fail) => Promise.resolve({ error: null }).then(ok, fail) }
        return {
          select: () => Promise.resolve({ data: db.tables[table], error: null }),
          upsert: write,
          delete: () => query,
        }
      },
    },
  }
})
vi.mock('../services/analytics', () => ({ track: vi.fn(), deviceId: () => 'test-device' }))
// Stable objects, as the real providers give: effects key on their identity.
const auth = vi.hoisted(() => ({ user: { id: 'u1' }, ready: true }))
vi.mock('./AuthContext', () => ({ useAuth: () => auth }))
// One stable object: the alert evaluator re-runs whenever `assets` changes identity.
const prices = vi.hoisted(() => ({ assets: [], session: null }))
vi.mock('./PricesContext', () => ({ usePrices: () => prices, useAssetSubscription: () => {} }))

const { FoldersProvider, useFolders } = await import('./FoldersContext')
const { AlertsProvider, useAlerts } = await import('./AlertsContext')

let container
let root
let folders
let alerts

function Probe() {
  folders = useFolders()
  alerts = useAlerts()
  return null
}

/** One page load: mount the providers and let them load the account. */
async function load() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () =>
    root.render(
      <FoldersProvider>
        <AlertsProvider>
          <Probe />
        </AlertsProvider>
      </FoldersProvider>,
    ),
  )
}
async function unload() {
  await act(async () => root.unmount())
  container.remove()
}
const folderIds = () => folders.folders.map((f) => f.id)

beforeEach(() => {
  localStorage.clear()
  db.tables = { user_folders: [], user_alerts: [] }
  db.refuse = (table, row) => (table === 'user_folders' ? row.id === 'refused' : row.asset_id === 'refused-alert')
})
afterEach(() => vi.useRealTimers())

describe('rows the account refused survive a reload', () => {
  it('keeps an imported folder the account refused, and keeps saying so', async () => {
    // A device used without an account, signing in for the first time.
    localStorage.setItem(
      'bw.folders.v1',
      JSON.stringify([
        { id: '__watchlist__', name: 'Watchlist', assetIds: [] },
        { id: 'kept', name: 'Kept', assetIds: [] },
        { id: 'refused', name: 'Refused', assetIds: [] },
      ]),
    )
    await load()
    await vi.waitFor(() => expect(folders.syncNotice).not.toBeNull())
    expect(db.tables.user_folders.map((r) => r.id).sort()).toEqual(['__watchlist__', 'kept'])
    await unload()

    await load() // the reload
    await vi.waitFor(() => expect(folderIds()).toEqual(['kept', 'refused']))
    expect(folders.syncNotice).not.toBeNull()
    await unload()
  })

  it('keeps an alert the account refused', async () => {
    localStorage.setItem(
      'bw.alerts.v1',
      JSON.stringify({ rules: { ok: { drift: { threshold: 1 } }, 'refused-alert': { drift: { threshold: 2 } } } }),
    )
    await load()
    await vi.waitFor(() => expect(alerts.syncNotice).not.toBeNull())
    expect(db.tables.user_alerts.map((r) => r.asset_id)).toEqual(['ok'])
    await unload()

    await load()
    await vi.waitFor(() => expect(Object.keys(alerts.rules).sort()).toEqual(['ok', 'refused-alert']))
    expect(alerts.syncNotice).not.toBeNull()
    await unload()
  })
})
