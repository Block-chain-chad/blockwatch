import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  toRaw,
  formatRaw,
  getSwapQuote,
  executeSwap,
  forgetUnresolvedSwaps,
  tokenProgramFor,
  SLIPPAGE_BPS,
  USDC_MINT,
} from './swap'
import { readSwapAudit } from './swapAudit'
import { JUPITER_PROGRAM, SPL_TOKEN_PROGRAM, TOKEN_2022_PROGRAM } from '../lib/swapCheck'

/*
 * Tests for the money path.
 *
 * Everything here was verified once by hand during review and would have
 * evaporated on the next edit. These are the properties that, if they break,
 * cost a user real funds or tell them a lie about where their money is:
 *
 *   1. toRaw is EXACT. It converts a typed amount into the smallest units
 *      actually submitted to the chain. A float rounding error here is a
 *      wrong-sized trade. formatRaw is the same promise in reverse: the
 *      number on screen is the number that was quoted.
 *   2. executeSwap's `phase` tag is correct. The UI decides between "nothing
 *      was sent, retry safely" and "this may be on-chain, check your wallet"
 *      purely from this tag. Getting it wrong in the optimistic direction
 *      invites a double-spend.
 *   3. Nothing reaches the wallet unchecked. The quote must describe the
 *      trade the user asked for, and the built transaction must be this
 *      user's single-signer Jupiter swap.
 *   4. The same trade cannot be in flight twice.
 *   5. Every attempt leaves an audit record, written before the wallet is
 *      asked so an outcome we never see is still traceable.
 */

const MINT = 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN'

// The same formula the mocked PublicKey below derives with. Stated twice on
// purpose: vi.mock is hoisted and cannot see anything declared out here. The
// REAL curve derivation is covered in lib/swapCheck.test.js against the real
// library; what matters to these tests is only that it is deterministic and
// changes with the mint.
const fakeAta = (owner, tokenProgram, mint) => `ata:${owner}:${tokenProgram}:${mint}`
const USDC_ACCOUNT = fakeAta('PUBKEY', SPL_TOKEN_PROGRAM, USDC_MINT)
const MINT_ACCOUNT = fakeAta('PUBKEY', TOKEN_2022_PROGRAM, MINT)

// A transaction shaped the way @solana/web3.js hands one back: one signer,
// this wallet paying, the trade's two token accounts, compute budget plus the
// Jupiter aggregator.
const goodTx = (feePayer = 'PUBKEY', outAccount = MINT_ACCOUNT) => ({
  message: {
    header: { numRequiredSignatures: 1 },
    staticAccountKeys: [
      { toBase58: () => feePayer },
      { toBase58: () => USDC_ACCOUNT },
      { toBase58: () => outAccount },
      { toBase58: () => 'ComputeBudget111111111111111111111111111111' },
      { toBase58: () => JUPITER_PROGRAM },
    ],
    compiledInstructions: [{ programIdIndex: 3 }, { programIdIndex: 4 }],
  },
})

// The mock deserializer decodes our fixtures: an empty payload is a broken
// transaction, 'evil' calls an unknown program, 'wrong-mint' is a perfectly
// well formed Jupiter swap in a pair nobody quoted.
vi.mock('@solana/web3.js', () => {
  // Stand-in for the address type. Deterministic, mint-sensitive, no curve
  // maths — which is all these tests need from it.
  class FakeKey {
    constructor(value) {
      this.value = String(value)
    }
    toBytes() {
      return this.value
    }
    toBase58() {
      return this.value
    }
    toString() {
      return this.value
    }
    static findProgramAddressSync(seeds) {
      return [new FakeKey(`ata:${seeds.join(':')}`), 255]
    }
  }
  return {
    PublicKey: FakeKey,
    VersionedTransaction: {
      deserialize: (bytes) => {
        if (bytes?.length === 0) throw new Error('bad transaction')
        const text = new TextDecoder().decode(bytes)
        if (text === 'evil') {
          const evil = goodTx()
          evil.message.staticAccountKeys[3] = {
            toBase58: () => 'DrainerProgram11111111111111111111111111',
          }
          return evil
        }
        if (text === 'other-payer') return goodTx('SOMEONE-ELSE')
        if (text === 'wrong-mint') {
          return goodTx('PUBKEY', 'ata:PUBKEY:some-program:SomeOtherMint')
        }
        return goodTx()
      },
    },
  }
})

const VALID_TX = btoa('a-real-transaction')

// A quote shaped on a real lite-api.jup.ag response: $10 of USDC into the
// token, 50 bps, guaranteed minimum consistent with that bound.
const QUOTE = {
  inputMint: USDC_MINT,
  outputMint: MINT,
  inAmount: '10000000',
  outAmount: '2893681',
  otherAmountThreshold: '2879213',
  swapMode: 'ExactIn',
  slippageBps: SLIPPAGE_BPS,
  platformFee: null,
  priceImpactPct: '0.0024101447573257889123',
}
const INTENT = { side: 'buy', mint: MINT, amountRaw: '10000000', ticker: 'GOOGLx' }

function fakeStorage() {
  const map = new Map()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
  }
}

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
})

describe('formatRaw — the number on screen is the number quoted', () => {
  it('renders smallest units back as the amount', () => {
    expect(formatRaw('2893681', 8)).toBe('0.0289')
    expect(formatRaw('1000000', 6)).toBe('1')
    expect(formatRaw('313940000', 6)).toBe('313.94')
    expect(formatRaw('0', 6)).toBe('0')
  })

  it('groups thousands', () => {
    expect(formatRaw('1234567890123', 6)).toBe('1,234,567.8901')
    expect(formatRaw('1000000000000', 6)).toBe('1,000,000')
  })

  it('truncates rather than rounds, so it never overstates the minimum', () => {
    // 0.99999 must not print as 1 beside the words "minimum received".
    expect(formatRaw('999990', 6)).toBe('0.9999')
    expect(formatRaw('999999', 6)).toBe('0.9999')
  })

  it('shows dust instead of a bare zero', () => {
    expect(formatRaw('3', 8)).toBe('0.00000003')
    expect(formatRaw('1200', 8)).toBe('0.000012')
  })

  it('stays exact past what a double can hold', () => {
    // Number('12345678901234567890') / 1e6 loses the tail; string math does not.
    expect(formatRaw('12345678901234567890', 6)).toBe('12,345,678,901,234.5678')
  })

  it('returns null for anything that is not a whole number of units', () => {
    for (const bad of ['', '1.5', '-1', 'abc', null, undefined]) {
      expect(formatRaw(bad, 6), String(bad)).toBe(null)
    }
    expect(formatRaw('100', -1)).toBe(null)
  })

  it('round-trips with toRaw', () => {
    for (const [amt, dec, expected] of [
      ['313.94', 6, '313.94'],
      ['1', 9, '1'],
      ['0.058', 6, '0.058'],
      ['999999.9999', 6, '999,999.9999'],
    ]) {
      expect(formatRaw(toRaw(amt, dec), dec), amt).toBe(expected)
    }
  })
})

describe('tokenProgramFor', () => {
  it('sends USDC to the classic token program and everything else to Token-2022', () => {
    // Every pinned address in data/verifiedMints.json was checked on chain to
    // be a Token-2022 mint, so the else branch is a fact, not a guess.
    expect(tokenProgramFor(USDC_MINT)).toBe(SPL_TOKEN_PROGRAM)
    expect(tokenProgramFor(MINT)).toBe(TOKEN_2022_PROGRAM)
  })
})

describe('executeSwap', () => {
  const provider = (overrides = {}) => ({
    publicKey: { toString: () => 'PUBKEY' },
    signAndSendTransaction: vi.fn(async () => ({ signature: 'SIG' })),
    ...overrides,
  })
  const buildReturns = (swapTransaction, over = {}) =>
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ swapTransaction, simulationError: null, ...over }),
    }))

  const run = (over = {}) =>
    executeSwap({ quote: QUOTE, provider: provider(), intent: INTENT, ...over })

  beforeEach(() => {
    vi.stubGlobal('fetch', buildReturns(VALID_TX))
    vi.stubGlobal('localStorage', fakeStorage())
    // Module-scope state that deliberately outlives one swap; each case needs
    // it empty or it inherits the previous case's lost transaction.
    forgetUnresolvedSwaps()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the wallet signature on success', async () => {
    await expect(run()).resolves.toBe('SIG')
  })

  /* --- Everything below here happens BEFORE the wallet is asked for anything.
         All of it must be phase 'build' so the UI can honestly say nothing was
         sent. --- */

  it("tags 'build' when no wallet is connected", async () => {
    const err = await run({ provider: {} }).catch((e) => e)
    expect(err.phase).toBe('build')
  })

  it("tags 'build' when the caller did not say what the user asked for", async () => {
    const err = await run({ intent: undefined }).catch((e) => e)
    expect(err.phase).toBe('build')
  })

  it("tags 'build' when Jupiter returns an error status", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503 })))
    const err = await run().catch((e) => e)
    expect(err.phase).toBe('build')
  })

  it("tags 'build' when the network is unreachable", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      })
    )
    const err = await run().catch((e) => e)
    expect(err.phase).toBe('build')
  })

  it("tags 'build' when Jupiter returns no transaction", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })))
    const err = await run().catch((e) => e)
    expect(err.phase).toBe('build')
  })

  it("tags 'build' when the transaction cannot be decoded", async () => {
    vi.stubGlobal('fetch', buildReturns(btoa('')))
    const err = await run().catch((e) => e)
    expect(err.phase).toBe('build')
  })

  it('never asks the wallet to sign when the build fails', async () => {
    const p = provider()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })))
    await executeSwap({ quote: QUOTE, provider: p, intent: INTENT }).catch(() => {})
    expect(p.signAndSendTransaction).not.toHaveBeenCalled()
  })

  /* --- The checks this task added. Each one is a refusal, and a refusal is
         always safe: it happens before the wallet sees anything. --- */

  it('refuses a quote that is not for the trade the user asked for', async () => {
    const wrongToken = { ...QUOTE, outputMint: 'SomeOtherMint' }
    const wrongSize = { ...QUOTE, inAmount: '100000000' }
    const withFee = { ...QUOTE, platformFee: { amount: '1000', feeBps: 10 } }
    for (const quote of [wrongToken, wrongSize, withFee]) {
      const p = provider()
      const err = await executeSwap({ quote, provider: p, intent: INTENT }).catch((e) => e)
      expect(err.phase).toBe('build')
      expect(p.signAndSendTransaction).not.toHaveBeenCalled()
    }
  })

  it('refuses a transaction another wallet pays for', async () => {
    const p = provider()
    vi.stubGlobal('fetch', buildReturns(btoa('other-payer')))
    const err = await executeSwap({ quote: QUOTE, provider: p, intent: INTENT }).catch((e) => e)
    expect(err.phase).toBe('build')
    expect(p.signAndSendTransaction).not.toHaveBeenCalled()
  })

  it('refuses a transaction that calls a program we do not expect', async () => {
    const p = provider()
    vi.stubGlobal('fetch', buildReturns(btoa('evil')))
    const err = await executeSwap({ quote: QUOTE, provider: p, intent: INTENT }).catch((e) => e)
    expect(err.phase).toBe('build')
    expect(p.signAndSendTransaction).not.toHaveBeenCalled()
  })

  it('refuses a transaction built for a mint the user never saw', async () => {
    // A real single-signer Jupiter swap, this wallet paying, only allowed
    // programs — but the output leg belongs to some other token. Nothing in
    // the quote check catches this: the quote is fine, the transaction is not.
    const p = provider()
    vi.stubGlobal('fetch', buildReturns(btoa('wrong-mint')))
    const err = await executeSwap({ quote: QUOTE, provider: p, intent: INTENT }).catch((e) => e)
    expect(err.phase).toBe('build')
    expect(err.message).toMatch(/token accounts/)
    expect(p.signAndSendTransaction).not.toHaveBeenCalled()
  })

  it('refuses a swap Jupiter has already simulated as failing', async () => {
    const p = provider()
    vi.stubGlobal(
      'fetch',
      buildReturns(VALID_TX, { simulationError: { errorCode: 'TRANSACTION_ERROR', error: '0x1' } })
    )
    const err = await executeSwap({ quote: QUOTE, provider: p, intent: INTENT }).catch((e) => e)
    expect(err.phase).toBe('build')
    expect(err.code).toBe('simulation')
    expect(p.signAndSendTransaction).not.toHaveBeenCalled()
  })

  /* --- Double submit. --- */

  /**
   * A wallet that parks every request until it is released, and lets a test
   * wait until the swap has actually reached it. Holding the swap exactly
   * there is the only moment a double submit can happen.
   */
  function heldWallet() {
    const waiting = []
    let arrived
    const reached = new Promise((resolve) => (arrived = resolve))
    const p = provider({
      signAndSendTransaction: vi.fn(() => {
        arrived()
        return new Promise((resolve) => waiting.push(() => resolve({ signature: 'SIG' })))
      }),
    })
    return { provider: p, reached, release: () => waiting.forEach((r) => r()) }
  }

  it('refuses a second identical swap while the first is still in the wallet', async () => {
    const wallet = heldWallet()
    const first = executeSwap({ quote: QUOTE, provider: wallet.provider, intent: INTENT })
    await wallet.reached

    const second = await executeSwap({
      quote: QUOTE,
      provider: wallet.provider,
      intent: INTENT,
    }).catch((e) => e)
    expect(second.phase).toBe('build')
    expect(second.message).toMatch(/already waiting/)
    // One trade, one signature request — the whole point.
    expect(wallet.provider.signAndSendTransaction).toHaveBeenCalledTimes(1)

    wallet.release()
    await expect(first).resolves.toBe('SIG')
  })

  it('refuses the same swap again after one whose outcome we never learned', async () => {
    // The wallet broadcast and then threw. signAndSendTransaction sends before
    // it can fail, so this trade may be on chain. Closing the sheet releases
    // the in-flight lock; reopening it and confirming the identical trade must
    // NOT go through on the strength of that.
    const lost = provider({
      signAndSendTransaction: vi.fn(async () => {
        throw new Error('Transaction was not confirmed in 30.00 seconds')
      }),
    })
    const first = await executeSwap({ quote: QUOTE, provider: lost, intent: INTENT }).catch((e) => e)
    expect(first.phase).toBe('broadcast')

    const again = provider()
    const repeat = await executeSwap({ quote: QUOTE, provider: again, intent: INTENT }).catch(
      (e) => e
    )
    expect(repeat.code).toBe('unresolved')
    // Never 'build': the sheet must not offer a clean retry for a trade that
    // may already have spent the money.
    expect(repeat.phase).toBe('broadcast')
    expect(repeat.message).toMatch(/few minutes ago/)
    expect(again.signAndSendTransaction).not.toHaveBeenCalled()
    expect(readSwapAudit().map((r) => r.event)).toEqual(['submitted', 'unknown', 'blocked'])
  })

  it('still lets a different trade through while one is unresolved', async () => {
    const lost = provider({
      signAndSendTransaction: vi.fn(async () => {
        throw new Error('Transaction was not confirmed in 30.00 seconds')
      }),
    })
    await executeSwap({ quote: QUOTE, provider: lost, intent: INTENT }).catch(() => {})
    const other = { ...INTENT, amountRaw: '20000000' }
    const otherQuote = { ...QUOTE, inAmount: '20000000' }
    await expect(
      executeSwap({ quote: otherQuote, provider: provider(), intent: other })
    ).resolves.toBe('SIG')
  })

  it('forgets an unresolved swap once the window has passed', async () => {
    // A lost swap must not lock that trade out for the rest of the session.
    vi.useFakeTimers()
    try {
      const lost = provider({
        signAndSendTransaction: vi.fn(async () => {
          throw new Error('Transaction was not confirmed in 30.00 seconds')
        }),
      })
      await executeSwap({ quote: QUOTE, provider: lost, intent: INTENT }).catch(() => {})
      vi.advanceTimersByTime(5 * 60_000 + 1)
      await expect(
        executeSwap({ quote: QUOTE, provider: provider(), intent: INTENT })
      ).resolves.toBe('SIG')
    } finally {
      vi.useRealTimers()
    }
  })

  it('lets the same swap be retried once the first one is finished', async () => {
    const p = provider()
    await executeSwap({ quote: QUOTE, provider: p, intent: INTENT })
    await expect(executeSwap({ quote: QUOTE, provider: p, intent: INTENT })).resolves.toBe('SIG')
  })

  it('does not block a different trade from the same wallet', async () => {
    const wallet = heldWallet()
    const first = executeSwap({ quote: QUOTE, provider: wallet.provider, intent: INTENT })
    await wallet.reached

    const second = executeSwap({
      quote: { ...QUOTE, inAmount: '20000000' },
      provider: wallet.provider,
      intent: { ...INTENT, amountRaw: '20000000' },
    })
    // A different amount is a different trade: it reaches the wallet too.
    await vi.waitFor(() =>
      expect(wallet.provider.signAndSendTransaction).toHaveBeenCalledTimes(2)
    )
    wallet.release()
    await expect(Promise.all([first, second])).resolves.toEqual(['SIG', 'SIG'])
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
    const err = await executeSwap({ quote: QUOTE, provider: p, intent: INTENT }).catch((e) => e)
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
      const err = await executeSwap({ quote: QUOTE, provider: p, intent: INTENT }).catch((e) => e)
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
    const err = await executeSwap({ quote: QUOTE, provider: p, intent: INTENT }).catch((e) => e)
    expect(err.code).toBe(4001)
    expect(err.message).toContain('rejected')
    expect(err.phase).toBe('broadcast')
  })

  /* --- The audit trail. --- */

  it('records the attempt before the wallet is asked, and the signature after', async () => {
    let seenAtSigning = null
    const p = provider({
      signAndSendTransaction: vi.fn(async () => {
        seenAtSigning = readSwapAudit()
        return { signature: 'SIG' }
      }),
    })
    await executeSwap({ quote: QUOTE, provider: p, intent: INTENT })

    // Already on the record while the wallet holds it — so a swap whose
    // outcome we never learn is still traceable to its exact terms.
    expect(seenAtSigning.map((r) => r.event)).toEqual(['submitted'])
    expect(seenAtSigning[0]).toMatchObject({
      side: 'buy',
      ticker: 'GOOGLx',
      inputMint: USDC_MINT,
      outputMint: MINT,
      amountRaw: '10000000',
      quotedOutRaw: '2893681',
      minOutRaw: '2879213',
      slippageBps: SLIPPAGE_BPS,
      // Jupiter's own decimal string, not a float we rounded.
      priceImpactPct: QUOTE.priceImpactPct,
    })

    const trail = readSwapAudit()
    expect(trail.map((r) => r.event)).toEqual(['submitted', 'sent'])
    expect(trail[1].signature).toBe('SIG')
    expect(trail[0].key).toBe(trail[1].key)
  })

  it('records the ratio and the typed figure, so the record is answerable later', async () => {
    // amountRaw is the typed figure divided by the issuer's ratio, and that
    // ratio moves on the issuer's own schedule. Reading it back a week later
    // gives whatever it is then, not what this trade used — so both the
    // number the user typed and the exact ratio applied go on the record.
    const p = provider({ signAndSendTransaction: vi.fn(async () => ({ signature: 'SIG' })) })
    await executeSwap({
      quote: QUOTE,
      provider: p,
      intent: { ...INTENT, typedAmount: '1', multiplier: '10' },
    })
    expect(readSwapAudit()[0]).toMatchObject({
      amountRaw: '10000000',
      typedAmount: '1',
      multiplier: '10',
    })
  })

  it('records nulls rather than inventing a ratio when the caller states none', async () => {
    const p = provider({ signAndSendTransaction: vi.fn(async () => ({ signature: 'SIG' })) })
    await executeSwap({ quote: QUOTE, provider: p, intent: INTENT })
    expect(readSwapAudit()[0]).toMatchObject({ typedAmount: null, multiplier: null })
  })

  it("records an ambiguous outcome as 'unknown', never as a failure", async () => {
    const p = provider({
      signAndSendTransaction: vi.fn(async () => {
        throw new Error('Transaction was not confirmed in 30.00 seconds')
      }),
    })
    await executeSwap({ quote: QUOTE, provider: p, intent: INTENT }).catch(() => {})
    expect(readSwapAudit().map((r) => r.event)).toEqual(['submitted', 'unknown'])
  })

  it("records a wallet cancellation as 'rejected'", async () => {
    const p = provider({
      signAndSendTransaction: vi.fn(async () => {
        const e = new Error('User rejected the request.')
        e.code = 4001
        throw e
      }),
    })
    await executeSwap({ quote: QUOTE, provider: p, intent: INTENT }).catch(() => {})
    expect(readSwapAudit().map((r) => r.event)).toEqual(['submitted', 'rejected'])
  })

  it('records a pre-wallet failure with the reason it was refused', async () => {
    vi.stubGlobal('fetch', buildReturns(btoa('evil')))
    await executeSwap({ quote: QUOTE, provider: provider(), intent: INTENT }).catch(() => {})
    const trail = readSwapAudit()
    expect(trail.map((r) => r.event)).toEqual(['failed'])
    expect(trail[0].reason).toMatch(/unexpected program/)
  })

  it('records a blocked double submit', async () => {
    const wallet = heldWallet()
    const first = executeSwap({ quote: QUOTE, provider: wallet.provider, intent: INTENT })
    await wallet.reached
    await executeSwap({ quote: QUOTE, provider: wallet.provider, intent: INTENT }).catch(() => {})
    expect(readSwapAudit().map((r) => r.event)).toContain('blocked')
    wallet.release()
    await first
  })
})

describe('getSwapQuote — always settles, and only returns a usable quote', () => {
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
      mint: MINT,
      amountRaw: '1000000',
      timeoutMs: 10,
    }).catch((e) => e)
    expect(err.code).toBe('timeout')
  })

  it('rejects a route with no output amount', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })))
    await expect(getSwapQuote({ side: 'buy', mint: MINT, amountRaw: '1000000' })).rejects.toThrow(
      /no route/
    )
  })

  it('returns a quote that matches what was asked', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => QUOTE })))
    await expect(
      getSwapQuote({ side: 'buy', mint: MINT, amountRaw: '10000000' })
    ).resolves.toMatchObject({ outAmount: '2893681' })
  })

  it('throws away a quote whose minimum is worse than the slippage we show', async () => {
    // Never display a promise we have not checked: this number is the one the
    // user decides on.
    const bad = { ...QUOTE, otherAmountThreshold: '1' }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => bad })))
    await expect(
      getSwapQuote({ side: 'buy', mint: MINT, amountRaw: '10000000' })
    ).rejects.toThrow(/unusable quote/)
  })

  it('throws away a quote for a different token than the one requested', async () => {
    const bad = { ...QUOTE, outputMint: 'SomeOtherMint' }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => bad })))
    await expect(
      getSwapQuote({ side: 'buy', mint: MINT, amountRaw: '10000000' })
    ).rejects.toThrow(/unusable quote/)
  })
})
