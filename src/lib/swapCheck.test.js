import { describe, it, expect } from 'vitest'
import { PublicKey, VersionedTransaction } from '@solana/web3.js'
import {
  checkQuote,
  checkBuiltTransaction,
  describeTransaction,
  associatedTokenAddress,
  JUPITER_PROGRAM,
  SPL_TOKEN_PROGRAM,
  TOKEN_2022_PROGRAM,
  WRAPPED_SOL_MINT,
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
    PublicKey,
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
    const seen = describeTransaction(tx())
    expect(seen.feePayer).toBe(WALLET)
    expect(seen.requiredSignatures).toBe(1)
    expect(seen.accounts).toEqual([WALLET, USDC_ATA, MINT_ATA, COMPUTE_BUDGET, JUPITER_PROGRAM])
    expect(seen.instructions.map((i) => i.program)).toEqual([COMPUTE_BUDGET, JUPITER_PROGRAM])
  })

  it("surfaces each instruction's data bytes and resolved accounts", () => {
    // Without these two the wrapped-SOL cleanup below cannot be told apart
    // from a token transfer, which is the whole point of reading them.
    const withDetail = tx({
      compiledInstructions: [
        { programIdIndex: 4, data: Uint8Array.from([9]), accountKeyIndexes: [1, 0, 0] },
      ],
    })
    const [only] = describeTransaction(withDetail).instructions
    expect(Array.from(only.data)).toEqual([9])
    expect(only.accounts).toEqual([USDC_ATA, WALLET, WALLET])
  })

  it('reads a legacy message too', () => {
    const legacy = tx({ compiledInstructions: undefined, instructions: [{ programIdIndex: 4 }] })
    expect(describeTransaction(legacy).instructions.map((i) => i.program)).toEqual([JUPITER_PROGRAM])
  })

  it('reports an unreadable program, account or data rather than guessing', () => {
    // A program id or account that lives in an address lookup table cannot be
    // resolved in the browser, so it must not silently pass as "fine". Legacy
    // messages base58-encode instruction data, which this module does not
    // decode — also null rather than a guess.
    const viaLookup = tx({ compiledInstructions: [{ programIdIndex: 99, accountKeyIndexes: [98] }] })
    const [only] = describeTransaction(viaLookup).instructions
    expect(only.program).toBe(null)
    expect(only.accounts).toEqual([null])
    expect(only.data).toBe(null)
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

/*
 * Jupiter routes THROUGH wrapped SOL often — about one built swap in three in
 * the reviewer's sample — even though neither leg of an Onstock trade is ever
 * native SOL. On those routes it opens a temporary wrapped-SOL account for the
 * user and closes it at the TOP LEVEL to hand the rent back. An earlier
 * version of this check refused every one of them.
 *
 * The allowance is one instruction shape and nothing else, so these cases
 * matter in both directions: the real cleanup must pass, and every neighbour
 * of it must not.
 */
describe('the wrapped-SOL cleanup a SOL-routed swap closes with', () => {
  const WSOL_ATA = ata(WRAPPED_SOL_MINT, SPL_TOKEN_PROGRAM)
  const STRANGER = 'GkQ4nBYs5NLRQnnsTjMXk8cCnLJeHZJnGb1qY2sNjYy9'

  /*
   * A SOL-routed buy: the ordinary swap, plus the close. Index 5 is the SPL
   * token program and 6 the account being closed, so a case can move either
   * without disturbing the rest of the message.
   */
  const routedViaSol = (instruction = {}) =>
    tx({
      staticAccountKeys: [
        key(WALLET),
        key(USDC_ATA),
        key(MINT_ATA),
        key(COMPUTE_BUDGET),
        key(JUPITER_PROGRAM),
        key(SPL_TOKEN_PROGRAM),
        key(WSOL_ATA),
        key(STRANGER),
      ],
      compiledInstructions: [
        { programIdIndex: 3 },
        { programIdIndex: 4 },
        {
          programIdIndex: 5,
          data: Uint8Array.from([9]), // CloseAccount
          accountKeyIndexes: [6, 0, 0], // wSOL account, rent to us, owned by us
          ...instruction,
        },
      ],
    })

  it('accepts the close of our own wrapped-SOL account', () => {
    expect(verify({ tx: routedViaSol() })).toEqual({ ok: true })
  })

  it('refuses closing an account that is not our wrapped-SOL account', () => {
    // Closing a token account sends its balance to the destination. Pointed
    // at the account holding the stock the user just bought, this shape would
    // empty it.
    expect(verify({ tx: routedViaSol({ accountKeyIndexes: [2, 0, 0] }) }).ok).toBe(false)
    expect(verify({ tx: routedViaSol({ accountKeyIndexes: [7, 0, 0] }) }).ok).toBe(false)
  })

  it('refuses sending the returned rent anywhere but back to the user', () => {
    expect(verify({ tx: routedViaSol({ accountKeyIndexes: [6, 7, 0] }) }).ok).toBe(false)
  })

  it('refuses a close authorised by someone other than the user', () => {
    expect(verify({ tx: routedViaSol({ accountKeyIndexes: [6, 0, 7] }) }).ok).toBe(false)
  })

  it('refuses a close carrying more accounts than CloseAccount takes', () => {
    expect(verify({ tx: routedViaSol({ accountKeyIndexes: [6, 0, 0, 7] }) }).ok).toBe(false)
  })

  it('refuses a token Transfer and a TransferChecked, which is the drain', () => {
    // Transfer is discriminator 3 with 9 data bytes, TransferChecked 12 with
    // 10. The allowance keys on both the length and the first byte, so
    // neither can pass as the one-byte close.
    const transfer = { data: new Uint8Array(9), accountKeyIndexes: [1, 7, 0] }
    transfer.data[0] = 3
    const checked = { data: new Uint8Array(10), accountKeyIndexes: [1, 7, 0] }
    checked.data[0] = 12
    expect(verify({ tx: routedViaSol(transfer) }).ok).toBe(false)
    expect(verify({ tx: routedViaSol(checked) }).ok).toBe(false)
  })

  it('refuses a close on a message whose data we cannot read', () => {
    // Legacy messages base58-encode instruction data. We do not decode it, so
    // the shape is unproven and the answer has to be no.
    expect(verify({ tx: routedViaSol({ data: '3' }) }).ok).toBe(false)
  })

  it('refuses the close when the caller gave us no way to derive the account', () => {
    // Without PublicKey the wrapped-SOL address cannot be derived, and an
    // underivable address must never be treated as a match.
    expect(verify({ tx: routedViaSol(), PublicKey: undefined }).ok).toBe(false)
  })

  /*
   * Not a hand-built fixture: this is a real transaction lite-api.jup.ag
   * built on 2026-09-15 for "sell 1 GOOGLx into USDC", routed
   * Whirlpool + Quantum, which took it through wrapped SOL. It was never
   * signed and never sent, and the wallet in it is a throwaway keypair
   * generated for the capture, so there is nothing here to protect.
   *
   * The hand-built cases above pin the rule; this one pins the rule to
   * reality. If Jupiter's cleanup ever changes shape, this is the case that
   * notices before a user does.
   */
  const REAL_WALLET = '2MyjKTJhQeqmvTLLGjgvAxTZ3GHJbFWwMmzb1U9VfxaU'
  const REAL_SWAP_BASE64 =
    'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAGChQ7co81CTWnlk0FsaMyj8mfvMMYnF2eqVaULwOupHvBCPsgEuoMQ7RNAafC1LJcKaxMeUZL6NkL7jtdWXKh6fJU3q53OXkadta3CaLdyZy2K1XkruVaFIY7UFY5UqpLUM1b8mxOPphBjn1FY3i72XIPRJYn1LP6+qJlt5OsokYtAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAAAR51VvyMcBu7nTFbs5oFQf9sbLeo/SOUQKxzaJWvBOPBt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKmMlyWPTiSJ8bs9ECkUjg2DC1oTmdr/EIQEjnvY2+n4WbQ/+if11/ZKdMCbHylYed5LCas238ndUUsyGqezjOXoFKO5r2z3Fmtm9BReVpHTttcVBTGxexL2vyOtJUlvDuEGBQAFAsBcFQAFAAkDBBcBAAAAAAAIBgADABwEBwEBCAYAAQAWBAcBAQYkBwACAwYcBgkGGgcZFAASFh0BDQIREw8OEBUAAQMLCgwbBxgXKuUXy5d6460qAgAAAC8AAGQAAX0AZAECAOH1BQAAAAAu8Y4UAAAAADIAAAcDAQAAAQkCBkesiPH9WNP0dPhu8dkDWf0a2fIJ0VlSv1q2qvzsTYsDq62oCQCpF6yvFQSqCrLRZwtoOIf3PvZK4yRWZHyfZU8OmPsOQdTMPgqo29YbBzPgONw13TYBNA=='

  const realSwap = () =>
    VersionedTransaction.deserialize(Buffer.from(REAL_SWAP_BASE64, 'base64'))

  it('accepts the real SOL-routed swap Jupiter built', () => {
    const forRealWallet = (mint, tokenProgram) =>
      associatedTokenAddress({ PublicKey, owner: REAL_WALLET, mint, tokenProgram })

    const verdict = checkBuiltTransaction({
      build: { simulationError: null },
      tx: realSwap(),
      publicKey: REAL_WALLET,
      expectedAccounts: [
        forRealWallet(MINT, TOKEN_2022_PROGRAM),
        forRealWallet(USDC, SPL_TOKEN_PROGRAM),
      ],
      PublicKey,
    })
    expect(verdict).toEqual({ ok: true })
  })

  it('is a transaction that really does close a wrapped-SOL account', () => {
    // Guards the case above from passing for the wrong reason: if the capture
    // were ever replaced by a route with no wrapped-SOL leg, it would stop
    // testing the thing it is named for.
    const closes = describeTransaction(realSwap()).instructions.filter(
      (i) => i.program === SPL_TOKEN_PROGRAM
    )
    expect(closes).toHaveLength(1)
    expect(Array.from(closes[0].data)).toEqual([9])
    expect(closes[0].accounts).toEqual([
      associatedTokenAddress({
        PublicKey,
        owner: REAL_WALLET,
        mint: WRAPPED_SOL_MINT,
        tokenProgram: SPL_TOKEN_PROGRAM,
      }),
      REAL_WALLET,
      REAL_WALLET,
    ])
  })

  it('refuses that same real transaction for a different wallet', () => {
    expect(
      checkBuiltTransaction({
        build: { simulationError: null },
        tx: realSwap(),
        publicKey: WALLET,
        expectedAccounts: accounts,
        PublicKey,
      }).ok
    ).toBe(false)
  })

  it('still refuses the token program on a transaction with no swap in it', () => {
    const noSwap = routedViaSol()
    noSwap.message.compiledInstructions = noSwap.message.compiledInstructions.filter(
      (i) => i.programIdIndex !== 4
    )
    expect(verify({ tx: noSwap }).ok).toBe(false)
  })
})
