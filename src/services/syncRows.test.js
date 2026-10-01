import { describe, it, expect, vi } from 'vitest'
import { upsertRows } from './syncRows'
import { pushFolders, pushRules } from './accountSync'

vi.mock('./supabase', () => ({ supabase: null }))

/*
 * One rejected row must not stop the rest of an account from syncing, and a
 * dropped connection must not be mistaken for a refusal.
 */

const REFUSED = { code: '23514', message: 'check constraint' }
const OFFLINE = { code: '', message: 'TypeError: Failed to fetch' }

/** A stand-in for the Supabase client that records what was asked. */
function fakeClient({ batch = null, row = () => null, del = null } = {}) {
  const calls = []
  return {
    calls,
    from(table) {
      return {
        upsert(rows) {
          calls.push({ table, op: 'upsert', rows })
          return Promise.resolve({ error: Array.isArray(rows) ? batch : row(rows) })
        },
        delete() {
          const query = {
            eq: () => query,
            not: () => query,
            then(resolve, reject) {
              calls.push({ table, op: 'delete' })
              return Promise.resolve({ error: del }).then(resolve, reject)
            },
          }
          return query
        },
      }
    },
  }
}

describe('upsertRows', () => {
  it('sends everything in one request when the database takes it', async () => {
    const client = fakeClient()
    expect(await upsertRows(client, 't', [{ id: 1 }, { id: 2 }])).toEqual({ rejected: 0, offline: false })
    expect(client.calls).toHaveLength(1)
  })

  it('falls back to one row at a time, so only the refused row is left out', async () => {
    const client = fakeClient({ batch: REFUSED, row: (r) => (r.id === 2 ? REFUSED : null) })
    expect(await upsertRows(client, 't', [{ id: 1 }, { id: 2 }, { id: 3 }])).toEqual({ rejected: 1, offline: false })
    expect(client.calls.map((c) => c.rows.id ?? 'batch')).toEqual(['batch', 1, 2, 3])
  })

  it('reports a dropped connection as offline, not as refused rows', async () => {
    expect(await upsertRows(fakeClient({ batch: OFFLINE }), 't', [{ id: 1 }])).toEqual({ rejected: 0, offline: true })
    const thrower = { from: () => ({ upsert: () => Promise.reject(new Error('down')) }) }
    expect(await upsertRows(thrower, 't', [{ id: 1 }])).toEqual({ rejected: 0, offline: true })
  })
})

describe('folder sync', () => {
  const watchlist = { id: '__watchlist__', name: 'Watchlist', assetIds: [] }
  const folders = (n) => Array.from({ length: n }, (_, i) => ({ id: `f${i}`, name: `F${i}`, assetIds: [] }))

  it('deletes first, then upserts the rows that fit, and counts the rest as unsynced', async () => {
    const client = fakeClient()
    const tooLong = { id: 'long', name: 'x'.repeat(101), assetIds: [] }
    const result = await pushFolders('u1', [watchlist, ...folders(2), tooLong], client)
    expect(result).toEqual({ unsynced: 1, offline: false })
    expect(client.calls.map((c) => c.op)).toEqual(['delete', 'upsert'])
    expect(client.calls[1].rows.map((r) => r.id)).toEqual(['__watchlist__', 'f0', 'f1'])
  })

  it('never sends more than 40 rows, and keeps the watchlist among them', async () => {
    const client = fakeClient()
    const result = await pushFolders('u1', [watchlist, ...folders(45)], client)
    expect(result.unsynced).toBe(6)
    expect(client.calls[1].rows).toHaveLength(40)
    expect(client.calls[1].rows[0].id).toBe('__watchlist__')
  })

  it('keeps syncing the other folders when the database refuses one', async () => {
    const client = fakeClient({ batch: REFUSED, row: (r) => (r.id === 'f1' ? REFUSED : null) })
    expect(await pushFolders('u1', [watchlist, ...folders(3)], client)).toEqual({ unsynced: 1, offline: false })
  })

  it('stops quietly when offline', async () => {
    expect(await pushFolders('u1', folders(2), fakeClient({ del: OFFLINE }))).toEqual({ unsynced: 0, offline: true })
  })
})

describe('alert sync', () => {
  const rules = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`a${i}`, { drift: { threshold: 1 } }]))

  it('sends at most 250 alerts and counts the rest', async () => {
    const client = fakeClient()
    const result = await pushRules('u1', rules(255), client)
    expect(result).toEqual({ unsynced: 5, offline: false })
    expect(client.calls[1].rows).toHaveLength(250)
  })

  it('leaves out an oversized rule but syncs the others', async () => {
    const client = fakeClient()
    const result = await pushRules('u1', { ...rules(2), big: { note: 'x'.repeat(600) } }, client)
    expect(result.unsynced).toBe(1)
    expect(client.calls[1].rows.map((r) => r.asset_id)).toEqual(['a0', 'a1'])
  })
})
