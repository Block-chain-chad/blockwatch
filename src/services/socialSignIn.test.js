import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'node:crypto'

/*
 * Sign in with Apple and Google. What is pinned here:
 *   - which buttons show, including Apple's rule that the iPhone app never
 *     offers Google without Apple beside it;
 *   - the nonce: the provider sees only its hash, Supabase gets the raw value,
 *     and the two agree;
 *   - the web flow comes back to /auth/callback;
 *   - analytics hears the method name and nothing else.
 */

const auth = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signInWithIdToken: vi.fn(),
}))
const plugin = vi.hoisted(() => ({ initialize: vi.fn(), login: vi.fn() }))
const track = vi.hoisted(() => vi.fn())

vi.mock('./supabase', () => ({ supabase: { auth } }))
vi.mock('./analytics', () => ({ track }))
vi.mock('@capgo/capacitor-social-login', () => ({ SocialLogin: plugin }))

const {
  signInOptions,
  randomNonce,
  sha256Hex,
  oauthRedirectUrl,
  isCancelled,
  startWebSignIn,
  signInNative,
  appleAuthorizationCode,
  usesApple,
} = await import('./socialSignIn')

beforeEach(() => {
  for (const fn of [auth.signInWithOAuth, auth.signInWithIdToken, plugin.initialize, plugin.login, track]) fn.mockReset()
  auth.signInWithOAuth.mockResolvedValue({ error: null })
  auth.signInWithIdToken.mockResolvedValue({ data: { session: {} }, error: null })
  plugin.initialize.mockResolvedValue(undefined)
})

describe('signInOptions', () => {
  const all = { appleOn: true, googleOn: true, passkeyOn: true, passkeySupported: true, googleIos: true }

  it('shows everything that is switched on, on the web', () => {
    expect(signInOptions({ native: false, ...all })).toEqual({ apple: true, google: true, passkey: true })
  })

  it('shows nothing that is switched off', () => {
    expect(signInOptions({ native: false, googleIos: true })).toEqual({ apple: false, google: false, passkey: false })
  })

  it('never shows Google in the iPhone app without Apple beside it', () => {
    expect(signInOptions({ ...all, native: true, appleOn: false }).google).toBe(false)
    expect(signInOptions({ ...all, native: true }).google).toBe(true)
  })

  it('hides Google in the app until its iOS client ID is set', () => {
    expect(signInOptions({ ...all, native: true, googleIos: false }).google).toBe(false)
    // The web does not need it.
    expect(signInOptions({ ...all, native: false, googleIos: false }).google).toBe(true)
  })

  it('keeps passkeys to the web, and to browsers that support them', () => {
    expect(signInOptions({ ...all, native: true }).passkey).toBe(false)
    expect(signInOptions({ ...all, native: false, passkeySupported: false }).passkey).toBe(false)
  })
})

describe('nonce helpers', () => {
  it('hashes to lowercase hex SHA-256', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('makes a fresh, URL-safe nonce each time', () => {
    const a = randomNonce()
    const b = randomNonce()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })
})

describe('web sign-in', () => {
  it('comes back to /auth/callback on this origin', async () => {
    await startWebSignIn('google', 'https://onstock.app')
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://onstock.app/auth/callback' },
    })
    expect(oauthRedirectUrl('https://onstock.app')).toBe('https://onstock.app/auth/callback')
  })

  it('refuses a provider it does not know', async () => {
    await expect(startWebSignIn('github', 'https://onstock.app')).rejects.toThrow()
    expect(auth.signInWithOAuth).not.toHaveBeenCalled()
  })

  it('passes a Supabase error on', async () => {
    auth.signInWithOAuth.mockResolvedValue({ error: new Error('provider disabled') })
    await expect(startWebSignIn('apple', 'https://onstock.app')).rejects.toThrow('provider disabled')
  })
})

describe('native sign-in', () => {
  it('gives Apple the hash of the nonce and Supabase the nonce itself', async () => {
    plugin.login.mockResolvedValue({ result: { idToken: 'apple.id.token' } })
    await signInNative('apple')
    const hashed = plugin.login.mock.calls[0][0].options.nonce
    const { nonce } = auth.signInWithIdToken.mock.calls[0][0]
    expect(hashed).toBe(createHash('sha256').update(nonce).digest('hex'))
    expect(auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'apple.id.token', nonce })
  })

  it("sends Google's access token along, for the hash its ID token may carry", async () => {
    plugin.login.mockResolvedValue({ result: { idToken: 'google.id.token', accessToken: { token: 'ya29.x' } } })
    await signInNative('google')
    expect(auth.signInWithIdToken.mock.calls[0][0]).toMatchObject({
      provider: 'google',
      token: 'google.id.token',
      access_token: 'ya29.x',
    })
  })

  it('counts a completed sign-in with the method name only', async () => {
    plugin.login.mockResolvedValue({ result: { idToken: 't', profile: { email: 'someone@example.com' } } })
    await signInNative('apple')
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('sign_in_completed', { method: 'apple' })
  })

  it('fails, and counts nothing, when there is no identity token or Supabase refuses it', async () => {
    plugin.login.mockResolvedValue({ result: {} })
    await expect(signInNative('apple')).rejects.toThrow()
    plugin.login.mockResolvedValue({ result: { idToken: 't' } })
    auth.signInWithIdToken.mockResolvedValue({ data: null, error: new Error('nonce mismatch') })
    await expect(signInNative('apple')).rejects.toThrow('nonce mismatch')
    expect(track).not.toHaveBeenCalled()
  })

  it('initializes the plugin once, with Apple set to hand back its authorization code', async () => {
    // A fresh module: the plugin is initialized once per page load, and the
    // tests above have already done it for this one.
    vi.resetModules()
    const fresh = await import('./socialSignIn')
    plugin.login.mockResolvedValue({ result: { idToken: 't' } })
    await fresh.signInNative('apple')
    await fresh.signInNative('apple')
    expect(plugin.initialize).toHaveBeenCalledTimes(1)
    expect(plugin.initialize.mock.calls[0][0].apple).toEqual({ clientId: 'app.blockwatch', useProperTokenExchange: true })
  })

  it('gets a fresh Apple authorization code for account deletion', async () => {
    plugin.login.mockResolvedValue({ result: { idToken: 't', authorizationCode: 'c.0.abc' } })
    expect(await appleAuthorizationCode()).toBe('c.0.abc')
    plugin.login.mockResolvedValue({ result: { idToken: 't' } })
    await expect(appleAuthorizationCode()).rejects.toThrow()
  })
})

describe('isCancelled and usesApple', () => {
  it('recognises the cancel errors Apple and Google raise', () => {
    expect(isCancelled(new Error('The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1001.)'))).toBe(true)
    expect(isCancelled(new Error('The user canceled the sign-in flow.'))).toBe(true)
    expect(isCancelled(new Error('network down'))).toBe(false)
  })

  it('reads Apple from identities or from the provider list', () => {
    expect(usesApple({ identities: [{ provider: 'apple' }] })).toBe(true)
    expect(usesApple({ app_metadata: { providers: ['email', 'apple'] } })).toBe(true)
    expect(usesApple({ identities: [{ provider: 'google' }], app_metadata: { providers: ['google'] } })).toBe(false)
    expect(usesApple(null)).toBe(false)
  })
})
