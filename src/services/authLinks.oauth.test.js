import { describe, it, expect, vi, beforeEach } from 'vitest'

/*
 * /auth/callback, where Sign in with Apple and Google land on the web. The
 * one-time code is redeemed once, a refusal at the provider is not an error
 * worth showing, and analytics learns the provider from Supabase's record,
 * never from the URL.
 */

const exchange = vi.hoisted(() => vi.fn())
const track = vi.hoisted(() => vi.fn())
vi.mock('./supabase', () => ({ supabase: { auth: { exchangeCodeForSession: exchange, verifyOtp: vi.fn() } } }))
vi.mock('./analytics', () => ({ track }))

const { parseOAuthCallback, handleOAuthCallback, consumePendingAuthResult } = await import('./authLinks')

const session = (provider) => ({ data: { session: { access_token: 'x' }, user: { app_metadata: { provider } } }, error: null })

beforeEach(() => {
  exchange.mockReset()
  track.mockReset()
  consumePendingAuthResult()
})

describe('parseOAuthCallback', () => {
  it('reads the code, or the error', () => {
    expect(parseOAuthCallback('https://onstock.app/auth/callback?code=abc')).toEqual({ code: 'abc' })
    expect(parseOAuthCallback('https://onstock.app/auth/callback?error=access_denied&error_description=x')).toEqual({
      error: 'access_denied',
    })
  })

  it('ignores everything else, without throwing', () => {
    for (const url of ['https://onstock.app/auth/confirm?code=abc', 'https://onstock.app/auth/callback', 'nope', null]) {
      expect(parseOAuthCallback(url)).toBeNull()
    }
  })
})

describe('handleOAuthCallback', () => {
  it('redeems the code and welcomes the person', async () => {
    exchange.mockResolvedValue(session('google'))
    expect(await handleOAuthCallback('https://onstock.app/auth/callback?code=c1')).toBe(true)
    expect(exchange).toHaveBeenCalledWith('c1')
    expect(consumePendingAuthResult()).toEqual({ kind: 'welcome' })
    expect(track).toHaveBeenCalledWith('sign_in_completed', { method: 'google' })
  })

  it('redeems a code once, however often the URL arrives', async () => {
    exchange.mockResolvedValue(session('apple'))
    await handleOAuthCallback('https://onstock.app/auth/callback?code=c2')
    await handleOAuthCallback('https://onstock.app/auth/callback?code=c2')
    expect(exchange).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledTimes(1)
  })

  it('says sign-in did not finish when the exchange fails', async () => {
    exchange.mockResolvedValue({ data: null, error: new Error('invalid flow state') })
    await handleOAuthCallback('https://onstock.app/auth/callback?code=c3')
    expect(consumePendingAuthResult()).toEqual({ kind: 'failed' })
    expect(track).not.toHaveBeenCalled()
  })

  it('stays quiet when the person declined at Apple or Google', async () => {
    await handleOAuthCallback('https://onstock.app/auth/callback?error=access_denied')
    expect(consumePendingAuthResult()).toBeNull()
    expect(exchange).not.toHaveBeenCalled()
  })

  it('reports other provider errors as a failed sign-in', async () => {
    await handleOAuthCallback('https://onstock.app/auth/callback?error=server_error')
    expect(consumePendingAuthResult()).toEqual({ kind: 'failed' })
  })

  it('counts only the two providers this path serves', async () => {
    exchange.mockResolvedValue(session('email'))
    await handleOAuthCallback('https://onstock.app/auth/callback?code=c4')
    expect(track).not.toHaveBeenCalled()
    expect(consumePendingAuthResult()).toEqual({ kind: 'welcome' })
  })
})
