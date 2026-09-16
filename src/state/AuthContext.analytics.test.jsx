import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * sign_in_completed for the two password paths. Counted in AuthProvider and
 * not in overlays/SignInSheet.jsx for two reasons: every caller of the path
 * is then counted, and the event is written where the email is in scope but
 * deliberately left out of it.
 *
 * Same probe-the-provider approach as state/FoldersContext.analytics.test.jsx.
 *
 * What is being defended: a sign-in that failed is not a sign-in. Supabase
 * reports a wrong password as an error rather than a throw, so the event has
 * to sit after the check, not before it.
 */

vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const auth = vi.hoisted(() => ({ result: {} }))

vi.mock('../services/analytics', () => ({ track: vi.fn(), deviceId: () => 'test-device' }))
vi.mock('../services/authLinks', () => ({
  consumePendingAuthResult: () => null,
  subscribeAuthLinks: () => () => {},
}))
vi.mock('../services/supabase', () => ({
  pendingRecovery: false,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve(auth.result),
      signUp: () => Promise.resolve(auth.result),
    },
  },
}))

const { track } = await import('../services/analytics')
const { AuthProvider, useAuth } = await import('./AuthContext')

const EMAIL = 'terra@onstock.test'
const PASSWORD = 'a-long-enough-password'

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

beforeEach(() => {
  track.mockClear()
  auth.result = {}
})

describe('sign_in_completed', () => {
  it('fires nothing on render', () => {
    mount()
    mount()
    expect(track).not.toHaveBeenCalled()
  })

  it('counts a password sign-in once', async () => {
    auth.result = { error: null }
    await mount().signInPassword(EMAIL, PASSWORD)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('sign_in_completed', { method: 'password' })
  })

  it('counts nothing when the password was wrong', async () => {
    auth.result = { error: new Error('Invalid login credentials') }
    await expect(mount().signInPassword(EMAIL, 'wrong')).rejects.toThrow()
    expect(track).not.toHaveBeenCalled()
  })

  it('counts a new account that signed in straight away', async () => {
    auth.result = { data: { session: { access_token: 'x' }, user: { identities: [{}] } }, error: null }
    await expect(mount().signUpPassword(EMAIL, PASSWORD)).resolves.toBe('signed-in')
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('sign_in_completed', { method: 'signup' })
  })

  it('counts nothing for a signup still waiting on its confirmation email', async () => {
    auth.result = { data: { session: null, user: { identities: [{}] } }, error: null }
    await expect(mount().signUpPassword(EMAIL, PASSWORD)).resolves.toBe('confirm')
    expect(track).not.toHaveBeenCalled()
  })

  it('counts nothing when the address already had an account', async () => {
    auth.result = { data: { session: null, user: { identities: [] } }, error: null }
    await expect(mount().signUpPassword(EMAIL, PASSWORD)).resolves.toBe('exists')
    expect(track).not.toHaveBeenCalled()
  })

  it('never puts the email address in a property', async () => {
    auth.result = { error: null }
    await mount().signInPassword(EMAIL, PASSWORD)
    const sent = JSON.stringify(track.mock.calls)
    expect(sent).not.toContain(EMAIL)
    expect(sent).not.toContain(PASSWORD)
  })
})
