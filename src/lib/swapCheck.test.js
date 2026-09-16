import { describe, it, expect } from 'vitest'
import { PublicKey } from '@solana/web3.js'
import {
  checkQuote,
  checkBuiltTransaction,
  describeTransaction,
  associatedTokenAddress,
  JUPITER_PROGRAM,
  SPL_TOKEN_PROGRAM,
  TOKEN_2022_PROGRAM,
} from './swapCheck'

/*
 * These are the refusals that stand between a tampered or mismatched response
 * and the user's wallet. Each one must stay a refusal: a check that quietly
 * starts passing is worse than no check, because the UI says "verified".
 */

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const MINT = 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN'

// On the allowlist until the drain-shape test below; each has a case of its own.
const SYSTEM_PROGRAM = '11111111111111111111111111111111'
const COMPUTE_BUDGET = 'ComputeBudget111111111111111111111111111111'

// A real base58 wallet, because these accounts are derived with the real
// curve maths rather than compared as strings.
const WALLET = '6dNVEJVpFbHYXRqZ5H9J8hnrfnp6X9UbLuGdMnUY9rhH'
const ata = (mint, tokenProgram) =>
  associatedTokenAddress({ PublicKey, owner: WALLET, mint, tokenProgram })

// The two token accounts a $10 USDC -> GOOGLx swap moves value between. USDC
// is a classic SPL token; xStocks are Token-2022, which lands its account on
// a different address entirely.
const USDC_ATA = ata(USDC, SPL_TOKEN_PROGRAM)
const MINT_ATA = ata(MINT, TOKEN_2022_PROGRAM)
const accounts = [USDC_ATA, MINT_ATA]

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

// Shaped like a real Jupiter v0 message: the fee payer first, then the token
// accounts the route touches, then the programs it calls at the top level.
// The pool accounts and route hops are NOT here — they live in an address
// lookup table — which is why the check only looks for the two accounts that
// cannot live in one.
const tx = (over = {}) => ({
  message: {
    header: { numRequiredSignatures: 1 },
    staticAccountKeys: [
      key(WALLET),
      key(USDC_ATA),
      key(MINT_ATA),
      key(COMPUTE_BUDGET),
      key(JUPITER_PROGRAM),
    ],
    compiledInstructions: [{ programIdIndex: 3 }, { programIdIndex: 4 }],
    ...over,
  },
})

/** checkBuiltTransaction for the trade the fixtures describe. */
const verify = (over = {}) =>
  checkBuiltTransaction({
    build: { simulationError: null },
    tx: tx(),
    publicKey: WALLET,
    expectedAccounts: accounts,
    ...over,
  })

describe('associatedTokenAddress', () => {
  it('derives the canonical associated token account', () => {
    // Pinned values. If this derivation ever drifts, every swap starts being
    // refused and the sheet stops working — a loud failure, but one worth
    // catching here rather than in someone's wallet.
    expect(USDC_ATA).toBe('3DZpkKdXKtfwWKm7bcrQ9XoW3ri9bxuAsxgUztPEwHRg')
    expect(MINT_ATA).toBe('3Auq7GdenwoZJqSptm4cHcEncx4cBd4WM3K7rvHMan5e')
  })

  it('lands somewhere else under the wrong token program', () => {
    // Getting this wrong for an xStock would refuse every buy, so the two
    // programs must genuinely produce different addresses.
    expect(ata(MINT, SPL_TOKEN_PROGRAM)).not.toBe(MINT_ATA)
  })

  it('throws rather than inventing an address', () => {
    expect(() => ata(MINT, 'not-a-program')).toThrow()
  })
})

describe('describeTransaction', () => {
  it('reads the fee payer, signer count, accounts and programs from a v0 message', () => {
    expect(describeTransaction(tx())).toEqual({
      feePayer: WALLET,
      requiredSignatures: 1,
      accounts: [WALLET, USDC_ATA, MINT_ATA, COMPUTE_BUDGET, JUPITER_PROGRAM],
      programs: [COMPUTE_BUDGET, JUPITER_PROGRAM],
    })
  })

  it('reads a legacy message too', () => {
    const legacy = tx({ compiledInstructions: undefined, instructions: [{ programIdIndex: 4 }] })
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
  it('accepts a single-signer Jupiter swap paid for by this wallet', () => {
    expect(verify()).toEqual({ ok: true })
  })

  it("refuses a transaction someone else's wallet pays for", () => {
    expect(verify({ publicKey: 'OTHER' }).ok).toBe(false)
  })

  it('refuses a transaction that wants more than the user signature', () => {
    expect(verify({ tx: tx({ header: { numRequiredSignatures: 2 } }) }).ok).toBe(false)
  })

  it('refuses a transaction calling a program we do not expect', () => {
    const evil = tx({
      staticAccountKeys: [
        key(WALLET),
        key(USDC_ATA),
        key(MINT_ATA),
        key('DrainerProgram111111111111111111111111111'),
      ],
      compiledInstructions: [{ programIdIndex: 3 }],
    })
    expect(verify({ tx: evil }).ok).toBe(false)
  })

  it('refuses the drain shape: transfers riding along with a real swap', () => {
    // Everything the rest of this check asks for is satisfied — one signature,
    // this wallet pays, both token accounts are present, and there IS a
    // Jupiter instruction. The two instructions in front of the swap move the
    // user's tokens and their SOL to whoever built the transaction. A real
    // Jupiter swap never calls the token or system programs at the TOP level;
    // it calls them from inside.
    const drain = tx({
      staticAccountKeys: [
        key(WALLET),
        key(USDC_ATA),
        key(MINT_ATA),
        key(SPL_TOKEN_PROGRAM),
        key(SYSTEM_PROGRAM),
        key(JUPITER_PROGRAM),
      ],
      compiledInstructions: [
        { programIdIndex: 3 }, // SPL token transfer — the user's tokens leave
        { programIdIndex: 4 }, // system transfer — the user's SOL leaves
        { programIdIndex: 5 }, // the swap, so it still reads as a trade
      ],
    })
    const verdict = verify({ tx: drain })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toMatch(/unexpected program/)
  })

  it('refuses each of the withdrawn programs on its own', () => {
    for (const program of [SPL_TOKEN_PROGRAM, TOKEN_2022_PROGRAM, SYSTEM_PROGRAM]) {
      const withExtra = tx({
        staticAccountKeys: [
          key(WALLET),
          key(USDC_ATA),
          key(MINT_ATA),
          key(JUPITER_PROGRAM),
          key(program),
        ],
        compiledInstructions: [{ programIdIndex: 3 }, { programIdIndex: 4 }],
      })
      expect(verify({ tx: withExtra }).ok, program).toBe(false)
    }
  })

  it('refuses a transaction built for a mint we did not quote', () => {
    // A genuine single-signer Jupiter swap, paid for by this wallet, calling
    // only allowed programs — but the output leg is wrapped SOL, not the
    // token on the screen. Without the account check this signs.
    const elsewhere = ata('So11111111111111111111111111111111111111112', SPL_TOKEN_PROGRAM)
    const wrongPair = tx({
      staticAccountKeys: [
        key(WALLET),
        key(USDC_ATA),
        key(elsewhere),
        key(COMPUTE_BUDGET),
        key(JUPITER_PROGRAM),
      ],
    })
    const verdict = verify({ tx: wrongPair })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toMatch(/token accounts/)
  })

  it('refuses a transaction missing the leg the user is spending', () => {
    const noInput = tx({
      staticAccountKeys: [key(WALLET), key(MINT_ATA), key(COMPUTE_BUDGET), key(JUPITER_PROGRAM)],
      compiledInstructions: [{ programIdIndex: 2 }, { programIdIndex: 3 }],
    })
    expect(verify({ tx: noInput }).ok).toBe(false)
  })

  it('refuses when the caller never said what to check against', () => {
    // A check that quietly passes when it is not configured is worse than no
    // check, because the sheet says "verified" either way.
    expect(verify({ expectedAccounts: undefined }).ok).toBe(false)
    expect(verify({ expectedAccounts: [] }).ok).toBe(false)
  })

  it('refuses a transaction with no swap in it', () => {
    expect(verify({ tx: tx({ compiledInstructions: [{ programIdIndex: 3 }] }) }).ok).toBe(false)
    expect(verify({ tx: tx({ compiledInstructions: [] }) }).ok).toBe(false)
  })

  it('refuses a swap Jupiter already simulated as failing', () => {
    const failing = { simulationError: { errorCode: 'TRANSACTION_ERROR', error: '0x1789' } }
    const verdict = verify({ build: failing })
    expect(verdict.ok).toBe(false)
    // Tagged so the sheet can name the reason instead of a blank retry.
    expect(verdict.code).toBe('simulation')
  })

  it('refuses when there is no wallet to check against', () => {
    expect(verify({ publicKey: null }).ok).toBe(false)
  })
})
