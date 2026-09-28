import { describe, it, expect, vi, beforeEach } from 'vitest'

/*
 * Emailed links that go through Supabase's verify page land back on the site
 * with a one-time ?code=, usually on the root because Supabase falls back to
 * the Site URL. The live bug: nothing redeemed it, so the person stayed signed
 * out even though their email was confirmed.
 */

const exchange = vi.hoisted(() => vi.fn())
const track = vi.hoisted(() => vi.fn())
vi.mock('./supabase', () => ({ supabase: { auth: { exchangeCodeForSession: exchange, verifyOtp: vi.fn() } } }))
vi.mock('./analytics', () => ({ track }))

const { parseEmailCode, withoutEmailLinkParams, handleEmailCode, handleOAuthCallback, consumePendingAuthResult } =
  await import('./authLinks')

const CODE = '0bf93b4c-dede-43cf-99ae-20be6ae9cd64'
const ok = (redirectType = null) => ({
  data: { session: { access_token: 'x' }, user: { app_metadata: { provider: 'email' } }, redirectType },
  error: null,
})

let n = 0
const freshCode = () => `0bf93b4c-dede-43cf-99ae-${String(++n).padStart(12, '0')}`

beforeEach(() => {
  exchange.mockReset()
  track.mockReset()
  consumePendingAuthResult()
})

describe('parseEmailCode', () => {
  it('reads a code that lands on the root or any other page', () => {
    expect(parseEmailCode(`https://onstock.app/?code=${CODE}`)).toEqual({ code: CODE })
    expect(parseEmailCode(`https://onstock.app/asset/nvda?code=${CODE}`)).toEqual({ code: CODE })
  })

  it('leaves the two paths with their own handlers alone', () => {
    expect(parseEmailCode(`https://onstock.app/auth/callback?code=${CODE}`)).toBeNull()
    expect(parseEmailCode(`https://onstock.app/auth/confirm?code=${CODE}`)).toBeNull()
  })

  it('ignores a code that is not a Supabase auth code', () => {
    expect(parseEmailCode('https://onstock.app/?code=SUMMER25')).toBeNull()
    expect(parseEmailCode('https://onstock.app/')).toBeNull()
    expect(parseEmailCode('not a url')).toBeNull()
    expect(parseEmailCode(null)).toBeNull()
  })

  it("reads Supabase's own link errors from the query or the hash", () => {
    expect(parseEmailCode('https://onstock.app/?error=access_denied&error_code=otp_expired&error_description=x')).toEqual({
      error: 'otp_expired',
    })
    expect(parseEmailCode('https://onstock.app/#error=access_denied&error_code=otp_expired&error_description=x')).toEqual({
      error: 'otp_expired',
    })
  })
})

describe('withoutEmailLinkParams', () => {
  it('removes only the link parameters and keeps the page', () => {
    expect(withoutEmailLinkParams(`https://onstock.app/?code=${CODE}`)).toBe('/')
    expect(withoutEmailLinkParams(`https://onstock.app/asset/nvda?tab=news&code=${CODE}`)).toBe('/asset/nvda?tab=news')
    expect(withoutEmailLinkParams('https://onstock.app/#error=access_denied&error_code=otp_expired')).toBe('/')
  })
})

describe('handleEmailCode', () => {
  it('redeems the code and welcomes the person (the live bug)', async () => {
    exchange.mockResolvedValue(ok())
    const code = freshCode()
    expect(await handleEmailCode(`https://onstock.app/?code=${code}`)).toBe(true)
    expect(exchange).toHaveBeenCalledWith(code)
    expect(consumePendingAuthResult()).toEqual({ kind: 'welcome' })
    expect(track).toHaveBeenCalledWith('sign_in_completed', { method: 'link' })
  })

  it('opens the new password step after a password reset link', async () => {
    exchange.mockResolvedValue(ok('recovery'))
    await handleEmailCode(`https://onstock.app/?code=${freshCode()}`)
    expect(consumePendingAuthResult()).toEqual({ kind: 'recovery' })
    expect(track).not.toHaveBeenCalled()
  })

  it('explains when the link was opened in a different browser', async () => {
    const error = Object.assign(new Error('PKCE code verifier not found in storage.'), {
      name: 'AuthPKCECodeVerifierMissingError',
    })
    exchange.mockResolvedValue({ data: { session: null, user: null, redirectType: null }, error })
    await handleEmailCode(`https://onstock.app/?code=${freshCode()}`)
    expect(consumePendingAuthResult()).toEqual({ kind: 'other-browser' })
  })

  it('calls any other failure an expired link', async () => {
    exchange.mockResolvedValue({ data: { session: null }, error: new Error('invalid flow state') })
    await handleEmailCode(`https://onstock.app/?code=${freshCode()}`)
    expect(consumePendingAuthResult()).toEqual({ kind: 'expired' })
    exchange.mockRejectedValue(new Error('network'))
    await handleEmailCode(`https://onstock.app/?code=${freshCode()}`)
    expect(consumePendingAuthResult()).toEqual({ kind: 'expired' })
  })

  it('calls a Supabase link error an expired link without calling Supabase', async () => {
    await handleEmailCode('https://onstock.app/?error=access_denied&error_code=otp_expired&error_description=x')
    expect(consumePendingAuthResult()).toEqual({ kind: 'expired' })
    expect(exchange).not.toHaveBeenCalled()
  })

  it('redeems a code once, even if it also arrives through the OAuth path', async () => {
    exchange.mockResolvedValue(ok())
    const code = freshCode()
    await handleEmailCode(`https://onstock.app/?code=${code}`)
    await handleEmailCode(`https://onstock.app/?code=${code}`)
    await handleOAuthCallback(`https://onstock.app/auth/callback?code=${code}`)
    expect(exchange).toHaveBeenCalledTimes(1)
  })

  it('does nothing for a page without a link', async () => {
    expect(await handleEmailCode('https://onstock.app/?code=SUMMER25')).toBe(false)
    expect(exchange).not.toHaveBeenCalled()
    expect(consumePendingAuthResult()).toBeNull()
  })
})
