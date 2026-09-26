import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/*
 * Passkeys. What is pinned: they are never offered in the iOS app (its
 * WebView cannot run WebAuthn for onstock.app), analytics never hears
 * anything about the passkey itself, the autofill path asks the browser for a
 * conditional request and gives up quietly where it cannot, and the "use
 * Face ID next time" offer is remembered per account.
 */

const native = vi.hoisted(() => ({ value: false }))
const auth = vi.hoisted(() => ({
  signInWithPasskey: vi.fn(),
  registerPasskey: vi.fn(),
  passkey: { list: vi.fn(), delete: vi.fn(), startAuthentication: vi.fn(), verifyAuthentication: vi.fn() },
}))
const track = vi.hoisted(() => vi.fn())
vi.mock('../lib/platform', () => ({ isNativeApp: () => native.value }))
vi.mock('./supabase', () => ({ supabase: { auth } }))
vi.mock('./analytics', () => ({ track }))

const pk = await import('./passkeys')

function browser({ conditional = true, parse = true, credential = { toJSON: () => ({ id: 'cred' }) } } = {}) {
  const PKC = function PublicKeyCredential() {}
  if (parse) PKC.parseRequestOptionsFromJSON = vi.fn((o) => ({ parsed: o }))
  PKC.isConditionalMediationAvailable = vi.fn(async () => conditional)
  return { PublicKeyCredential: PKC, navigator: { credentials: { get: vi.fn(async () => credential) } } }
}

let store
beforeEach(() => {
  native.value = false
  track.mockReset()
  for (const fn of [auth.signInWithPasskey, auth.registerPasskey, ...Object.values(auth.passkey)]) fn.mockReset()
  store = {}
  vi.stubGlobal('localStorage', {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => delete store[k],
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('passkeysSupported', () => {
  it('is true in a browser with WebAuthn', () => {
    expect(pk.passkeysSupported(browser())).toBe(true)
  })

  it('is false in the iOS app, even if the WebView exposes the API', () => {
    native.value = true
    expect(pk.passkeysSupported(browser())).toBe(false)
  })

  it('is false without WebAuthn', () => {
    expect(pk.passkeysSupported({ navigator: {} })).toBe(false)
    expect(pk.passkeysSupported(undefined)).toBe(false)
  })
})

describe('passkeyName', () => {
  it('matches what the device will actually ask for', () => {
    expect(pk.passkeyName('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)')).toBe('Face ID')
    expect(pk.passkeyName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('Face ID')
    expect(pk.passkeyName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('Touch ID')
    expect(pk.passkeyName('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('a passkey')
  })
})

describe('sign in, add, list, remove', () => {
  it('counts a passkey sign-in by method only', async () => {
    auth.signInWithPasskey.mockResolvedValue({ data: { session: { access_token: 't' }, user: { email: 'a@b.c' } }, error: null })
    await pk.signInWithPasskey()
    expect(track).toHaveBeenCalledWith('sign_in_completed', { method: 'passkey' })
  })

  it('throws, and counts nothing, when the passkey is refused', async () => {
    auth.signInWithPasskey.mockResolvedValue({ data: null, error: new Error('no') })
    await expect(pk.signInWithPasskey()).rejects.toThrow('no')
    expect(track).not.toHaveBeenCalled()
  })

  it('counts an added passkey with no details about it', async () => {
    auth.registerPasskey.mockResolvedValue({ data: { id: 'pk-1', friendly_name: 'iPhone' }, error: null })
    await pk.registerPasskey()
    expect(track).toHaveBeenCalledTimes(1)
    expect(track.mock.calls[0]).toEqual(['passkey_added'])
  })

  it('lists and removes', async () => {
    auth.passkey.list.mockResolvedValue({ data: [{ id: 'pk-1' }], error: null })
    expect(await pk.listPasskeys()).toEqual([{ id: 'pk-1' }])
    auth.passkey.delete.mockResolvedValue({ data: null, error: null })
    await pk.removePasskey('pk-1')
    expect(auth.passkey.delete).toHaveBeenCalledWith({ passkeyId: 'pk-1' })
  })
})

describe('startPasskeyAutofill', () => {
  const challenge = { data: { challenge_id: 'ch-1', options: { challenge: 'abc' } }, error: null }

  it('asks for a conditional request and signs in with what the browser returns', async () => {
    const win = browser()
    auth.passkey.startAuthentication.mockResolvedValue(challenge)
    auth.passkey.verifyAuthentication.mockResolvedValue({ data: { session: {} }, error: null })
    const signal = new AbortController().signal
    expect(await pk.startPasskeyAutofill(signal, win)).toBe(true)
    expect(win.navigator.credentials.get).toHaveBeenCalledWith({
      publicKey: { parsed: { challenge: 'abc' } },
      mediation: 'conditional',
      signal,
    })
    expect(auth.passkey.verifyAuthentication).toHaveBeenCalledWith({ challengeId: 'ch-1', credential: { id: 'cred' } })
    expect(track).toHaveBeenCalledWith('sign_in_completed', { method: 'passkey' })
  })

  it('does nothing where the browser cannot do conditional requests or parse WebAuthn JSON', async () => {
    expect(await pk.startPasskeyAutofill(undefined, browser({ conditional: false }))).toBe(false)
    expect(await pk.startPasskeyAutofill(undefined, browser({ parse: false }))).toBe(false)
    expect(auth.passkey.startAuthentication).not.toHaveBeenCalled()
  })

  it('gives up quietly when the request is aborted', async () => {
    const win = browser()
    win.navigator.credentials.get.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    auth.passkey.startAuthentication.mockResolvedValue(challenge)
    expect(await pk.startPasskeyAutofill(new AbortController().signal, win)).toBe(false)
    expect(track).not.toHaveBeenCalled()
  })

  it('does not ask for a challenge once aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    expect(await pk.startPasskeyAutofill(controller.signal, browser())).toBe(false)
    expect(auth.passkey.startAuthentication).not.toHaveBeenCalled()
  })

  it('never runs in the iOS app', async () => {
    native.value = true
    expect(await pk.startPasskeyAutofill(undefined, browser())).toBe(false)
  })
})

describe('the one-time offer', () => {
  it('is remembered per account', () => {
    expect(pk.wasOffered('u1')).toBe(false)
    pk.markOffered('u1')
    expect(pk.wasOffered('u1')).toBe(true)
    expect(pk.wasOffered('u2')).toBe(false)
  })

  it('survives blocked storage without throwing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(pk.wasOffered('u1')).toBe(false)
    expect(() => pk.markOffered('u1')).not.toThrow()
  })
})

describe('isPasskeyCancel', () => {
  it('treats a dismissed prompt as a cancel', () => {
    expect(pk.isPasskeyCancel(Object.assign(new Error('x'), { name: 'NotAllowedError' }))).toBe(true)
    expect(pk.isPasskeyCancel({ code: 'ERROR_CEREMONY_ABORTED' })).toBe(true)
    expect(pk.isPasskeyCancel(new Error('network'))).toBe(false)
  })
})
