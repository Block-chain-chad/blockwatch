import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const { requestAccountDeletion, clearAccountStorage, accountStorageKeys } = await import('./accountDeletion')

/*
 * The app side of account deletion: it proves who is asking with the
 * person's own access token, sends the Apple code only when there is one,
 * and afterwards clears the account's data from the device while leaving
 * display settings alone.
 */

describe('requestAccountDeletion', () => {
  it("sends the person's own token and no body when there is no Apple code", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ deleted: true, apple: 'not-used' }) }))
    const out = await requestAccountDeletion({ accessToken: 'jwt.abc.def', fetchImpl })
    expect(out).toEqual({ deleted: true, apple: 'not-used' })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/delete-account')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer jwt.abc.def')
    expect(JSON.parse(init.body)).toEqual({})
  })

  it('passes the Apple code along when the app has one', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ deleted: true }) }))
    await requestAccountDeletion({ accessToken: 't', appleAuthorizationCode: 'c.0.x', fetchImpl })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ appleAuthorizationCode: 'c.0.x' })
  })

  it('throws on any refusal, and without a token', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 502 }))
    await expect(requestAccountDeletion({ accessToken: 't', fetchImpl })).rejects.toThrow('502')
    await expect(requestAccountDeletion({ accessToken: '', fetchImpl })).rejects.toThrow()
  })

  it('carries the status, so the sheet can tell "sign in again" (403) from a failure', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 403 }))
    await expect(requestAccountDeletion({ accessToken: 't', fetchImpl })).rejects.toMatchObject({ status: 403 })
  })
})

describe('clearAccountStorage', () => {
  it("includes the device's holdings and this account's holdings cache", () => {
    expect(accountStorageKeys('u1')).toEqual(expect.arrayContaining(['bw.holdings.v1', 'bw.holdings.u.u1']))
  })

  it("removes the account's data and keeps display settings", () => {
    const store = new Map(
      [...accountStorageKeys('u1'), 'bw.theme.v1', 'bw.device.v1', 'bw.folders.u.other'].map((k) => [k, 'x']),
    )
    const storage = { removeItem: (k) => store.delete(k) }
    clearAccountStorage('u1', storage)
    expect([...store.keys()].sort()).toEqual(['bw.device.v1', 'bw.folders.u.other', 'bw.theme.v1'])
  })

  it('does not throw when storage is blocked', () => {
    const storage = {
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    expect(() => clearAccountStorage('u1', storage)).not.toThrow()
  })
})
