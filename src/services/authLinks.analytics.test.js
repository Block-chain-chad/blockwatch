import { describe, it, expect, vi, beforeEach } from 'vitest'

/*
 * sign_in_completed for the third way in: an emailed link. Magic links and
 * signup confirmations both end with a live session, so both are completed
 * sign-ins; a password-recovery link is not — it lands on "set a new
 * password" and the person may never finish.
 *
 * The one that matters here is the repeat. iOS delivers the same launch URL
 * twice on a cold start (getLaunchUrl and the retained appUrlOpen event), and
 * handleAuthLink already swallows the second. That guard is what keeps one
 * person from counting as two, so it is asserted rather than assumed.
 *
 * Each case uses its own token: the guard is module-level and lives for the
 * whole file, exactly as it does for the life of a tab.
 */

const supabaseState = vi.hoisted(() => ({ verify: null }))

vi.mock('./analytics', () => ({ track: vi.fn(), deviceId: () => 'test-device' }))
vi.mock('./supabase', () => ({
  pendingRecovery: false,
  supabase: { auth: { verifyOtp: (...args) => supabaseState.verify(...args) } },
}))

const { track } = await import('./analytics')
const { handleAuthLink } = await import('./authLinks')

const link = (token, type) =>
  `https://onstock.test/auth/confirm?token_hash=${token}&type=${type}`

const signedIn = () => Promise.resolve({ data: { session: { access_token: 'x' } }, error: null })
const deadLink = () => Promise.resolve({ data: { session: null }, error: { message: 'expired' } })

beforeEach(() => {
  track.mockClear()
  supabaseState.verify = signedIn
})

describe('sign_in_completed from an emailed link', () => {
  it('counts a magic link once', async () => {
    await handleAuthLink(link('tok-magic', 'magiclink'))
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('sign_in_completed', { method: 'link' })
  })

  it('counts a signup confirmation the same way', async () => {
    await handleAuthLink(link('tok-signup', 'signup'))
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('sign_in_completed', { method: 'link' })
  })

  it('counts the same link once when it arrives twice', async () => {
    await handleAuthLink(link('tok-twice', 'magiclink'))
    await handleAuthLink(link('tok-twice', 'magiclink'))
    expect(track).toHaveBeenCalledTimes(1)
  })

  it('counts nothing for a password-recovery link — nobody is signed in yet', async () => {
    await handleAuthLink(link('tok-recovery', 'recovery'))
    expect(track).not.toHaveBeenCalled()
  })

  it('counts nothing for a dead link', async () => {
    supabaseState.verify = deadLink
    await handleAuthLink(link('tok-dead', 'magiclink'))
    expect(track).not.toHaveBeenCalled()
  })

  it('counts nothing when the exchange throws', async () => {
    supabaseState.verify = () => Promise.reject(new Error('offline'))
    await handleAuthLink(link('tok-offline', 'magiclink'))
    expect(track).not.toHaveBeenCalled()
  })

  it('counts nothing for a URL that is not an auth link at all', async () => {
    await handleAuthLink('https://onstock.test/privacy.html')
    expect(track).not.toHaveBeenCalled()
  })

  it('never puts the one-time token in a property', async () => {
    await handleAuthLink(link('tok-secret-value', 'magiclink'))
    expect(JSON.stringify(track.mock.calls)).not.toContain('tok-secret-value')
  })
})
