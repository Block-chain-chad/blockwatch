import { describe, it, expect } from 'vitest'
import {
  checkQuote,
  checkBuiltTransaction,
  describeTransaction,
  JUPITER_PROGRAM,
} from './swapCheck'

/*
 * These are the refusals that stand between a tampered or mismatched response
 * and the user's wallet. Each one must stay a refusal: a check that quietly
 * starts passing is worse than no check, because the UI says "verified".
 */

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const MINT = 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN'

// The three programs that used to be on the top-level allowlist. They are the
// building blocks of a wallet drainer, so each one has a test of its own.
const SPL_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
const SYSTEM_PROGRAM = '11111111111111111111111111111111'

// Shaped on a real lite-api.jup.ag quote: $10 of USDC into GOOGLx at 50 bps.
const quote = (over = {}) => ({
  inputMint: USDC,
  outputMint: MINT,
  inAmount: '10000000',
  outAmount: '2893681',
  otherAmountThreshold: '2879213',
  swapMode: 'ExactIn',
  slippageBps: 50,
  platformFee: null,
  ...over,
})

const asked = { inputMint: USDC, outputMint: MINT, amountRaw: '10000000', slippageBps: 50 }

describe('checkQuote', () => {
  it('accepts the quote we actually asked for', () => {
    expect(checkQuote({ quote: quote(), ...asked })).toEqual({ ok: true })
  })

  it('refuses a quote for a different token', () => {
    expect(checkQuote({ quote: quote({ outputMint: 'SomeOtherMint' }), ...asked }).ok).toBe(false)
    expect(checkQuote({ quote: quote({ inputMint: 'SomeOtherMint' }), ...asked }).ok).toBe(false)
  })

  it('refuses a quote for a different amount', () => {
    // The trap this closes: quote $10, sign for $100.
    expect(checkQuote({ quote: quote({ inAmount: '100000000' }), ...asked }).ok).toBe(false)
  })

  it('refuses an exact-out quote, which would spend an unbounded input', () => {
    expect(checkQuote({ quote: quote({ swapMode: 'ExactOut' }), ...asked }).ok).toBe(false)
  })

  it('refuses a quote carrying a platform fee', () => {
    // This app charges none anywhere. One appearing means the response is not
    // the one we asked for.
    const fee = { amount: '1000', feeBps: 10 }
    expect(checkQuote({ quote: quote({ platformFee: fee }), ...asked }).ok).toBe(false)
  })

  it('refuses a quote quoted at a different slippage than we show', () => {
    expect(checkQuote({ quote: quote({ slippageBps: 500 }), ...asked }).ok).toBe(false)
  })

  it('refuses a guaranteed minimum worse than the slippage shown', () => {
    // 50 bps of 2893681 floors to 2879212. One unit below that is a promise
    // we did not make.
    expect(checkQuote({ quote: quote({ otherAmountThreshold: '2879212' }), ...asked }).ok).toBe(true)
    expect(checkQuote({ quote: quote({ otherAmountThreshold: '2879211' }), ...asked }).ok).toBe(
      false
    )
  })

  it('refuses a minimum above the expected output', () => {
    expect(checkQuote({ quote: quote({ otherAmountThreshold: '2893682' }), ...asked }).ok).toBe(
      false
    )
  })

  it('refuses amounts that are not whole units', () => {
    for (const bad of ['', '1.5', '-1', 'abc', null, undefined, '1e6']) {
      expect(checkQuote({ quote: quote({ outAmount: bad }), ...asked }).ok, `out ${bad}`).toBe(false)
      expect(checkQuote({ quote: quote({ inAmount: bad }), ...asked }).ok, `in ${bad}`).toBe(false)
    }
  })

  it('stays exact above what a double can hold', () => {
    const huge = '90071992547409910000'
    const off = '90071992547409910001'
    expect(
      checkQuote({
        quote: quote({ inAmount: huge }),
        ...asked,
        amountRaw: huge,
      }).ok
    ).toBe(true)
    // A float comparison would call these equal and sign the wrong size.
    expect(
      checkQuote({
        quote: quote({ inAmount: off }),
        ...asked,
        amountRaw: huge,
      }).ok
    ).toBe(false)
  })

  it('refuses nothing at all', () => {
    expect(checkQuote({ quote: null, ...asked }).ok).toBe(false)
  })
})

const key = (s) => ({ toBase58: () => s })

const tx = (over = {}) => ({
  message: {
    header: { numRequiredSignatures: 1 },
    staticAccountKeys: [
      key('WALLET'),
      key('ComputeBudget111111111111111111111111111111'),
      key(JUPITER_PROGRAM),
    ],
    compiledInstructions: [{ programIdIndex: 1 }, { programIdIndex: 2 }],
    ...over,
  },
})

describe('describeTransaction', () => {
  it('reads the fee payer, signer count and programs from a v0 message', () => {
    expect(describeTransaction(tx())).toEqual({
      feePayer: 'WALLET',
      requiredSignatures: 1,
      programs: ['ComputeBudget111111111111111111111111111111', JUPITER_PROGRAM],
    })
  })

  it('reads a legacy message too', () => {
    const legacy = tx({ compiledInstructions: undefined, instructions: [{ programIdIndex: 2 }] })
    expect(describeTransaction(legacy).programs).toEqual([JUPITER_PROGRAM])
  })

  it('reports an unreadable program rather than guessing', () => {
    // A program id that lives in an address lookup table cannot be resolved
    // in the browser, so it must not silently pass as "fine".
    const viaLookup = tx({ compiledInstructions: [{ programIdIndex: 99 }] })
    expect(describeTransaction(viaLookup).programs).toEqual([null])
  })
})

describe('checkBuiltTransaction', () => {
  const build = { simulationError: null }

  it('accepts a single-signer Jupiter swap paid for by this wallet', () => {
    expect(checkBuiltTransaction({ build, tx: tx(), publicKey: 'WALLET' })).toEqual({ ok: true })
  })

  it("refuses a transaction someone else's wallet pays for", () => {
    expect(checkBuiltTransaction({ build, tx: tx(), publicKey: 'OTHER' }).ok).toBe(false)
  })

  it('refuses a transaction that wants more than the user signature', () => {
    const multi = tx({ header: { numRequiredSignatures: 2 } })
    expect(checkBuiltTransaction({ build, tx: multi, publicKey: 'WALLET' }).ok).toBe(false)
  })

  it('refuses a transaction calling a program we do not expect', () => {
    const evil = tx({
      staticAccountKeys: [key('WALLET'), key('DrainerProgram111111111111111111111111111')],
      compiledInstructions: [{ programIdIndex: 1 }],
    })
    expect(checkBuiltTransaction({ build, tx: evil, publicKey: 'WALLET' }).ok).toBe(false)
  })

  it('refuses the drain shape: transfers riding along with a real swap', () => {
    // Everything the rest of this check asks for is satisfied — one signature,
    // this wallet pays, and there IS a Jupiter instruction in it. The two
    // instructions in front of the swap move the user's tokens and their SOL
    // to whoever built the transaction. A real Jupiter swap never calls the
    // token or system programs at the TOP level; it calls them from inside.
    const drain = tx({
      staticAccountKeys: [
        key('WALLET'),
        key(SPL_TOKEN_PROGRAM),
        key(SYSTEM_PROGRAM),
        key(JUPITER_PROGRAM),
      ],
      compiledInstructions: [
        { programIdIndex: 1 }, // SPL token transfer — the user's tokens leave
        { programIdIndex: 2 }, // system transfer — the user's SOL leaves
        { programIdIndex: 3 }, // the swap, so it still reads as a trade
      ],
    })
    const verdict = checkBuiltTransaction({ build, tx: drain, publicKey: 'WALLET' })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toMatch(/unexpected program/)
  })

  it('refuses each of the withdrawn programs on its own', () => {
    for (const program of [SPL_TOKEN_PROGRAM, TOKEN_2022_PROGRAM, SYSTEM_PROGRAM]) {
      const withExtra = tx({
        staticAccountKeys: [key('WALLET'), key(JUPITER_PROGRAM), key(program)],
        compiledInstructions: [{ programIdIndex: 1 }, { programIdIndex: 2 }],
      })
      expect(
        checkBuiltTransaction({ build, tx: withExtra, publicKey: 'WALLET' }).ok,
        program
      ).toBe(false)
    }
  })

  it('refuses a transaction with no swap in it', () => {
    const empty = tx({ compiledInstructions: [{ programIdIndex: 1 }] })
    expect(checkBuiltTransaction({ build, tx: empty, publicKey: 'WALLET' }).ok).toBe(false)
    const nothing = tx({ compiledInstructions: [] })
    expect(checkBuiltTransaction({ build, tx: nothing, publicKey: 'WALLET' }).ok).toBe(false)
  })

  it('refuses a swap Jupiter already simulated as failing', () => {
    const failing = { simulationError: { errorCode: 'TRANSACTION_ERROR', error: '0x1789' } }
    const verdict = checkBuiltTransaction({ build: failing, tx: tx(), publicKey: 'WALLET' })
    expect(verdict.ok).toBe(false)
    // Tagged so the sheet can name the reason instead of a blank retry.
    expect(verdict.code).toBe('simulation')
  })

  it('refuses when there is no wallet to check against', () => {
    expect(checkBuiltTransaction({ build, tx: tx(), publicKey: null }).ok).toBe(false)
  })
})
