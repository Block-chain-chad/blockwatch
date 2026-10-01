import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * The new AuthProvider methods: Apple and Google go native in the iOS app and
 * through the browser on the web, and deleteAccount signs out on this device
 * and clears the account's local data only after the server confirms, with an
 * analytics event that carries nothing.
 */

vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const h = vi.hoisted(() => ({
  native: false,
  signOut: vi.fn(async () => ({})),
  signInNative: vi.fn(async () => {}),
  startWebSignIn: vi.fn(async () => {}),
  requestAccountDeletion: vi.fn(),
  clearAccountStorage: vi.fn(),
  session: null,
}))

vi.mock('../services/analytics', () => ({ track: vi.fn(), deviceId: () => 'test-device' }))
vi.mock('../lib/platform', () => ({ isNativeApp: () => h.native }))
vi.mock('../services/authLinks', () => ({
  consumePendingAuthResult: () => null,
  subscribeAuthLinks: () => () => {},
}))
vi.mock('../services/socialSignIn', () => ({ signInNative: h.signInNative, startWebSignIn: h.startWebSignIn }))
vi.mock('../services/passkeys', () => ({ signInWithPasskey: vi.fn() }))
vi.mock('../services/accountDeletion', () => ({
  requestAccountDeletion: h.requestAccountDeletion,
  clearAccountStorage: h.clearAccountStorage,
}))
vi.mock('../services/supabase', () => ({
  pendingRecovery: false,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: h.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: h.signOut,
    },
  },
}))

const { track } = await import('../services/analytics')
const { AuthProvider, useAuth } = await import('./AuthContext')

function mount() {
  let api = null
  function Probe() {
    api = useAuth()
    return null
  }
  renderToStaticMarkup(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  return api
}

const SESSION = { access_token: 'jwt.a.b', user: { id: 'u1', email: 'someone@example.com' } }

beforeEach(() => {
  h.native = false
  h.session = SESSION
  for (const fn of [h.signOut, h.signInNative, h.startWebSignIn, h.requestAccountDeletion, h.clearAccountStorage, track]) fn.mockClear()
  h.requestAccountDeletion.mockResolvedValue({ deleted: true, apple: 'not-used' })
})

describe('signOut', () => {
  it("clears this device's signed-in holdings cache, and keeps the guest copy", async () => {
    const store = new Map([
      ['bw.holdings.u.u1', '{}'],
      ['bw.holdings.v1', '[]'],
      ['bw.folders.v1', '[]'],
    ])
    vi.stubGlobal('localStorage', {
      get length() {
        return store.size
      },
      key: (i) => [...store.keys()][i] ?? null,
      removeItem: (k) => store.delete(k),
    })
    try {
      await mount().signOut()
      expect(h.signOut).toHaveBeenCalled()
      expect([...store.keys()]).toEqual(['bw.holdings.v1', 'bw.folders.v1'])
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('signInWithProvider', () => {
  it('uses the browser flow on the web', async () => {
    await mount().signInWithProvider('google')
    expect(h.startWebSignIn).toHaveBeenCalledWith('google')
    expect(h.signInNative).not.toHaveBeenCalled()
  })

  it('uses the native sheet in the iOS app', async () => {
    h.native = true
    await mount().signInWithProvider('apple')
    expect(h.signInNative).toHaveBeenCalledWith('apple')
    expect(h.startWebSignIn).not.toHaveBeenCalled()
  })
})

describe('deleteAccount', () => {
  it("sends the session's token, then signs out locally and clears the device", async () => {
    await mount().deleteAccount({ appleAuthorizationCode: 'c.0.x' })
    expect(h.requestAccountDeletion).toHaveBeenCalledWith({ accessToken: 'jwt.a.b', appleAuthorizationCode: 'c.0.x' })
    expect(h.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(h.clearAccountStorage).toHaveBeenCalledWith('u1')
    expect(track).toHaveBeenCalledWith('account_deleted')
    expect(JSON.stringify(track.mock.calls)).not.toContain('someone@example.com')
  })

  it('keeps the session and the device data when the server refuses', async () => {
    h.requestAccountDeletion.mockRejectedValue(new Error('delete-account 502'))
    await expect(mount().deleteAccount()).rejects.toThrow('502')
    expect(h.signOut).not.toHaveBeenCalled()
    expect(h.clearAccountStorage).not.toHaveBeenCalled()
    expect(track).not.toHaveBeenCalled()
  })

  it('refuses when nobody is signed in', async () => {
    h.session = null
    await expect(mount().deleteAccount()).rejects.toThrow()
    expect(h.requestAccountDeletion).not.toHaveBeenCalled()
  })
})
