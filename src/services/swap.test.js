import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toRaw, fromRaw, getSwapQuote, executeSwap } from './swap'

/*
 * Tests for the money path.
 *
 * Everything here was verified once by hand during review and would have
 * evaporated on the next edit. These are the properties that, if they break,
 * cost a user real funds or tell them a lie about where their money is:
 *
 *   1. toRaw is EXACT. It converts a typed amount into the smallest units
 *      actually submitted to the chain. A float rounding error here is a
 *      wrong-sized trade.
 *   2. executeSwap's `phase` tag is correct. The UI decides between "nothing
 *      was sent, retry safely" and "this may be on-chain, check your wallet"
 *      purely from this tag. Getting it wrong in the optimistic direction
 *      invites a double-spend.
 */

vi.mock('@solana/web3.js', () => ({
  VersionedTransaction: {
    deserialize: (bytes) => {
      if (bytes?.length === 0) throw new Error('bad transaction')
      return { __tx: true }
    },
  },
}))

const VALID_TX = btoa('a-real-transaction')

describe('toRaw — exactness', () => {
  it('scales by decimals without floating point error', () => {
    expect(toRaw('1', 6)).toBe('1000000')
    expect(toRaw('313.94', 6)).toBe('313940000')
    expect(toRaw('0.058', 6)).toBe('58000')
  })

  it('stays exact on values a double cannot hold', () => {
    // Number('12345678901234567890') is 12345678901234567000 — a float would
    // silently drop the last three digits of the user's amount.
    expect(toRaw('12345678901234567890', 6)).toBe('12345678901234567890000000')
  })

  it('accepts exponent notation, which <input type=number> permits', () => {
    // A browser lets you type or paste 1e5 into a number input. Rejecting it
    // told the user their $100,000 was "too small to swap".
    expect(toRaw('1e5', 6)).toBe(toRaw('100000', 6))
    expect(toRaw('1E5', 6)).toBe(toRaw('100000', 6))
    expect(toRaw('1.5e3', 6)).toBe(toRaw('1500', 6))
    expect(toRaw('0.5e1', 6)).toBe(toRaw('5', 6))
  })

  it('truncates below one atomic unit rather than inventing precision', () => {
    expect(toRaw('0.0000001', 6)).toBe('0')
    expect(toRaw('1e-7', 6)).toBe('0')
  })

  it('returns 0 for anything it cannot parse — never a fabricated number', () => {
    for (const bad of ['', '.', 'abc', '-5', '1e', 'e5', '0x10', '1.2.3', '  ']) {
      expect(toRaw(bad, 6)).toBe('0')
    }
  })

  it('round-trips through fromRaw', () => {
    for (const [amt, dec] of [
      ['313.94', 6],
      ['1', 9],
      ['0.058', 6],
      ['999999.999999', 6],
    ]) {
      expect(Number(fromRaw(toRaw(amt, dec), dec))).toBeCloseTo(Number(amt), 8)
    }
  })
})

describe('executeSwap — phase tagging', () => {
  const provider = (overrides = {}) => ({
    publicKey: { toString: () => 'PUBKEY' },
    signAndSendTransaction: vi.fn(async () => ({ signature: 'SIG' })),
    ...overrides,
  })
  const okFetch = () =>
    vi.fn(async () => ({ ok: true, json: async () => ({ swapTransaction: VALID_TX }) }))

  beforeEach(() => {
    vi.stubGlobal('fetch', okFetch())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the wallet signature on success', async () => {
    await expect(executeSwap({ quote: {}, provider: provider() })).resolves.toBe('SIG')
  })

  /* --- Everything below here happens BEFORE the wallet is asked for anything.
         All of it must be phase 'build' so the UI can honestly say nothing was
         sent. --- */

  it("tags 'build' when no wallet is connected", async () => {
    const err = await executeSwap({ quote: {}, provider: {} }).catch((e) => e)
    expect(err.phase).toBe('build')
  })

  it("tags 'build' when Jupiter returns an error status", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503 })))
    const err = await executeSwap({ quote: {}, provider: provider() }).catch((e) => e)
    expect(err.phase).toBe('build')
  })

  it("tags 'build' when the network is unreachable", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      })
    )
    const err = await executeSwap({ quote: {}, provider: provider() }).catch((e) => e)
    expect(err.phase).toBe('build')
  })

  it("tags 'build' when Jupiter returns no transaction", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })))
    const err = await executeSwap({ quote: {}, provider: provider() }).catch((e) => e)
    expect(err.phase).toBe('build')
  })

  it("tags 'build' when the transaction cannot be decoded", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ swapTransaction: btoa('') }) }))
    )
    const err = await executeSwap({ quote: {}, provider: provider() }).catch((e) => e)
    expect(err.phase).toBe('build')
  })

  it('never asks the wallet to sign when the build fails', async () => {
    const p = provider()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })))
    await executeSwap({ quote: {}, provider: p }).catch(() => {})
    expect(p.signAndSendTransaction).not.toHaveBeenCalled()
  })

  /* --- Past this line the wallet HAS been asked to sign and send. The
         transaction may already be on-chain, so nothing here may ever be
         reported as 'build'. This is the invariant that prevents a false
         "nothing was sent" and the double-swap it would invite. --- */

  it("tags 'broadcast' when the wallet throws after being asked to send", async () => {
    const p = provider({
      signAndSendTransaction: vi.fn(async () => {
        throw new Error('network error')
      }),
    })
    const err = await executeSwap({ quote: {}, provider: p }).catch((e) => e)
    expect(err.phase).toBe('broadcast')
  })

  it("never tags a post-broadcast failure as 'build', whatever the wallet says", async () => {
    // Real wallet/relay errors whose text would otherwise read as a
    // cancellation. Phase must survive so the UI's precedence rule works.
    const messages = [
      'Transaction rejected by the leader',
      'bundle declined by relay after submission',
      'Transaction was not confirmed in 30.00 seconds',
      'User rejected the request.',
      '',
    ]
    for (const message of messages) {
      const p = provider({
        signAndSendTransaction: vi.fn(async () => {
          throw new Error(message)
        }),
      })
      const err = await executeSwap({ quote: {}, provider: p }).catch((e) => e)
      expect(err.phase, `message: ${message}`).toBe('broadcast')
      expect(err.phase, `message: ${message}`).not.toBe('build')
    }
  })

  it("preserves the wallet's own code and message", async () => {
    // The UI treats code 4001 as a genuine user cancellation. If the re-tag
    // dropped it, a real "I changed my mind" would show the alarming
    // may-be-on-chain screen instead.
    const p = provider({
      signAndSendTransaction: vi.fn(async () => {
        const e = new Error('User rejected the request.')
        e.code = 4001
        throw e
      }),
    })
    const err = await executeSwap({ quote: {}, provider: p }).catch((e) => e)
    expect(err.code).toBe(4001)
    expect(err.message).toContain('rejected')
    expect(err.phase).toBe('broadcast')
  })
})

describe('getSwapQuote — always settles', () => {
  afterEach(() => vi.unstubAllGlobals())

  it("throws code 'timeout' rather than hanging forever", async () => {
    // A hung quote used to leave the sheet reading "Quoting…" indefinitely
    // while Confirm stayed live against an ageing quote.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
          })
      )
    )
    const err = await getSwapQuote({
      side: 'buy',
      mint: 'MINT',
      amountRaw: '1000000',
      timeoutMs: 10,
    }).catch((e) => e)
    expect(err.code).toBe('timeout')
  })

  it('rejects a route with no output amount', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })))
    await expect(
      getSwapQuote({ side: 'buy', mint: 'MINT', amountRaw: '1000000' })
    ).rejects.toThrow(/no route/)
  })
})
