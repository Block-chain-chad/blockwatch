// What we check before a transaction is allowed near the user's wallet.
//
// Two separate questions, both pure so they can be tested without a network
// or a chain:
//
//   checkQuote            — does this quote describe the trade the user
//                           actually asked for, on the terms we showed them?
//   checkBuiltTransaction — is the thing Jupiter built for that quote
//                           something we're willing to ask the wallet to sign?
//
// Honest about the limit, in both directions.
//
// WHAT IS NOT PROVEN HERE. A browser cannot decode a Jupiter route and prove
// it pays out what the quote promised. The pool accounts and the route's own
// hops live in an address lookup table the page never fetches, and the real
// guarantee of the minimum received is enforced ON CHAIN by the swap program
// itself, against the otherAmountThreshold baked into the route. Neither the
// DIRECTION nor the SIZE of the transfer is checked below.
//
// WHAT IS PROVEN HERE, on the built transaction:
//   - it is payable by this wallet and needs only this wallet's signature;
//   - every top-level instruction calls a program we expect, or is the single
//     wrapped-SOL cleanup shape spelled out at isWrappedSolCleanup below;
//   - it contains a Jupiter instruction, so it is a swap at all;
//   - it NAMES the user's associated token accounts for BOTH of the mints the
//     quote names. Those two addresses are derived here from the quote and
//     looked for in message.staticAccountKeys — where they really do live,
//     because a user-specific account cannot sit in one of Jupiter's shared
//     lookup tables.
// Read that last one for exactly what it is. Forcing the transaction to NAME
// both accounts is not the same as proving they are where the value comes
// from and where it goes: a hostile builder could name them as read-only
// filler and route the value through a lookup-table address instead. It
// raises the cost of handing us a transaction in a different pair than the
// one on the screen; it does not rule one out.
// And on the quote itself: its own numbers are internally consistent with the
// slippage bound printed on the screen.
//
// NATIVE SOL is never a LEG. services/swap.js only ever trades USDC against a
// verified xStocks mint, so neither side of the trade is the native mint. The
// ROUTE is a different matter, and this file used to confuse the two: Jupiter
// regularly hops through wrapped SOL (USDC -> SOL -> GOOGLx), and when it
// does it opens a temporary wrapped-SOL account for the user and closes it at
// the TOP LEVEL to hand back the rent. That close is an SPL Token
// instruction. Assuming it could never appear refused about one real swap in
// three, so it is now allowed — in one exact shape and no other.
//
// Every failure is a refusal to sign, which is always safe: nothing has been
// sent at that point.

// Programs a Jupiter swap may invoke AT THE TOP LEVEL with no further
// questions asked: compute budget (fee and unit limit), associated token
// (create the destination account), and the aggregator itself.
//
// This list is NOT the whole story, and an earlier comment here claiming it
// was had simply never seen a SOL-routed swap. The SPL token program appears
// too, for the wrapped-SOL cleanup described above; it is admitted one
// instruction shape at a time, by isWrappedSolCleanup, never by sitting here.
//
// The SPL token programs and the system program are deliberately absent as
// blanket entries, and that absence is the point. A swap does move tokens,
// but it moves them from INSIDE Jupiter — as inner instructions the
// aggregator issues under its own authority. A token transfer or a SOL
// transfer sitting at the top level, carrying the user's signature, is not
// something a swap needs and is exactly the shape a drainer takes: move the
// user's balance out, then add one Jupiter instruction so the transaction
// still looks like a trade. With those programs allowed wholesale, that
// transaction passed every other check in this file.
//
// Any further widening gets made deliberately, one readable shape at a time,
// with the reason written down — never because a response turned up asking
// for it.
export const JUPITER_PROGRAM = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'
export const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
export const ALLOWED_PROGRAMS = new Set([
  JUPITER_PROGRAM,
  'ComputeBudget111111111111111111111111111111',
  ASSOCIATED_TOKEN_PROGRAM,
])

// The two programs a mint can be owned by. These are NOT allowed as top-level
// callers (see above); they name the program an associated token account is
// derived UNDER, which changes the address it lands on.
export const SPL_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
export const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'

// Native SOL's mint. Never a leg of an Onstock trade, but a routing hop often
// enough that the account Jupiter opens for it has to be recognisable here.
// Wrapped SOL is a classic SPL token, so its account derives under
// SPL_TOKEN_PROGRAM, not Token-2022.
export const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112'

/**
 * The owner's associated token account for one mint, base58.
 *
 * `PublicKey` is passed in rather than imported so this module stays free of
 * @solana/web3.js: services/swap.js already loads that library dynamically
 * when a swap sheet opens, and a static import here would drag it into the
 * main bundle. The derivation is the canonical one — the associated token
 * program's address for the seeds [owner, token program, mint].
 *
 * Throws if any of the three is not a valid address. The caller treats that
 * as a refusal to sign, like every other failure in this module.
 */
export function associatedTokenAddress({ PublicKey, owner, mint, tokenProgram }) {
  const [ata] = PublicKey.findProgramAddressSync(
    [
      new PublicKey(owner).toBytes(),
      new PublicKey(tokenProgram).toBytes(),
      new PublicKey(mint).toBytes(),
    ],
    new PublicKey(ASSOCIATED_TOKEN_PROGRAM)
  )
  return ata.toBase58()
}

const ok = { ok: true }
const no = (reason) => ({ ok: false, reason })

/** A whole-number amount string as BigInt, or null if it isn't one. */
function amount(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const s = String(value).trim()
  if (!/^\d+$/.test(s)) return null
  return BigInt(s)
}

/**
 * Does `quote` describe exactly the trade we asked for?
 *
 * `amountRaw` is the input amount in the input mint's smallest units, as a
 * string — the same value that was sent to the quote endpoint.
 */
export function checkQuote({ quote, inputMint, outputMint, amountRaw, slippageBps }) {
  if (!quote || typeof quote !== 'object') return no('no quote')
  if (quote.inputMint !== inputMint) return no('quote is for a different token in')
  if (quote.outputMint !== outputMint) return no('quote is for a different token out')
  if (quote.swapMode !== 'ExactIn') return no(`quote is ${quote.swapMode ?? 'an unknown'} mode`)

  const asked = amount(amountRaw)
  const spending = amount(quote.inAmount)
  if (asked === null) return no('amount is not a whole number of units')
  if (spending === null) return no('quote does not say what it spends')
  if (spending !== asked) return no('quote spends a different amount')

  // A platform fee would come out of the user's proceeds. This app attaches
  // none anywhere (see services/swap.js), so one appearing in a response
  // means the response is not ours.
  if (quote.platformFee) return no('quote carries a platform fee')

  if (Number(quote.slippageBps) !== slippageBps) return no('quote uses a different slippage')

  const out = amount(quote.outAmount)
  const min = amount(quote.otherAmountThreshold)
  if (out === null || out <= 0n) return no('quote has no output amount')
  if (min === null || min <= 0n) return no('quote has no guaranteed minimum')
  if (min > out) return no('guaranteed minimum is above the expected output')

  // The minimum received is the only number the user is promised. It must be
  // at least the slippage bound we printed beside it — integer math, because
  // this is money.
  const bound = (out * BigInt(10_000 - slippageBps)) / 10_000n
  if (min < bound) return no('guaranteed minimum is worse than the slippage shown')

  return ok
}

/**
 * The few facts about a built transaction a browser can read without
 * resolving address lookup tables. Tolerates both message shapes @solana/web3
 * can hand back (v0 `compiledInstructions`, legacy `instructions`).
 */
export function describeTransaction(tx) {
  const message = tx?.message ?? {}
  const keys = (message.staticAccountKeys ?? []).map((k) => k?.toBase58?.() ?? String(k))
  const compiled = message.compiledInstructions ?? message.instructions ?? []
  return {
    feePayer: keys[0] ?? null,
    requiredSignatures: message.header?.numRequiredSignatures ?? null,
    // Every account the message itself names. Lookup-table entries are not in
    // here, which is exactly why the accounts we go looking for are ones that
    // cannot live in a lookup table (see the header).
    accounts: keys,
    instructions: compiled.map((i) => ({
      // null for a program id that lives in a lookup table rather than in the
      // message — unresolvable here, and therefore not something we will sign.
      program: keys[i?.programIdIndex] ?? null,
      // Raw bytes on a v0 message. A legacy message base58-encodes its data
      // and this module does not decode base58, so it is null there — and
      // null satisfies no allowed instruction shape, which is the safe way
      // round.
      data: i?.data instanceof Uint8Array ? i.data : null,
      // This instruction's accounts, in order, resolved through the same
      // table; null again for anything that lives in a lookup table.
      accounts: (i?.accountKeyIndexes ?? i?.accounts ?? []).map((n) => keys[n] ?? null),
    })),
  }
}

// SPL Token's CloseAccount instruction: a single data byte, discriminator 9.
// The two shapes a drainer would want are Transfer (discriminator 3, nine
// bytes) and TransferChecked (12, ten bytes), so neither can be mistaken for
// this one on length or first byte.
const CLOSE_ACCOUNT = 9

/**
 * Is this top-level SPL Token instruction the wrapped-SOL cleanup Jupiter
 * appends when a route hops through native SOL? That is the only SPL Token
 * instruction this file will sign at the top level.
 *
 * Everything has to match at once: CloseAccount, exactly three accounts, and
 * those three being the wallet's own wrapped-SOL associated token account,
 * the wallet as the destination for the returned rent, and the wallet as the
 * owner authorising the close. Closing somebody else's account, or sending
 * the rent anywhere but back to the user, is refused like any other surprise.
 *
 * `PublicKey` is threaded in for the same reason associatedTokenAddress takes
 * it: this module stays free of @solana/web3.js. Without it the derivation
 * throws and the answer is no, which is the right way to fail.
 */
function isWrappedSolCleanup({ instruction, publicKey, PublicKey }) {
  const { data, accounts } = instruction
  if (!data || data.length !== 1 || data[0] !== CLOSE_ACCOUNT) return false
  if (accounts.length !== 3) return false
  if (accounts[1] !== publicKey || accounts[2] !== publicKey) return false
  try {
    return (
      accounts[0] ===
      associatedTokenAddress({
        PublicKey,
        owner: publicKey,
        mint: WRAPPED_SOL_MINT,
        tokenProgram: SPL_TOKEN_PROGRAM,
      })
    )
  } catch {
    return false
  }
}

/**
 * Is this transaction safe to hand to the wallet?
 *
 * `build` is Jupiter's /swap response body; `tx` the deserialized
 * transaction; `publicKey` the connected wallet, base58; `PublicKey` the
 * class from @solana/web3.js, needed to derive the wrapped-SOL account a
 * SOL-routed swap closes.
 *
 * `expectedAccounts` is what ties the transaction to the quote: the token
 * accounts this exact trade has to name, derived from the quote's mints by
 * associatedTokenAddress. It is REQUIRED — a caller that omits it gets a
 * refusal, never a quiet pass, because a check that no-ops when it is not
 * configured is worse than no check at all.
 */
export function checkBuiltTransaction({ build, tx, publicKey, expectedAccounts, PublicKey }) {
  // Jupiter simulates the transaction it built. If it already knows the swap
  // fails, asking the user to sign it just burns their fee.
  if (build?.simulationError) {
    const detail = build.simulationError.error ?? build.simulationError.errorCode
    return { ok: false, reason: `Jupiter says this swap would fail (${detail})`, code: 'simulation' }
  }

  const { feePayer, requiredSignatures, instructions, accounts } = describeTransaction(tx)
  if (requiredSignatures !== 1) {
    return no(`transaction wants ${requiredSignatures} signatures, not just yours`)
  }
  if (!publicKey) return no('no wallet to check the transaction against')
  if (feePayer !== publicKey) return no('transaction is not payable by your wallet')
  if (instructions.length === 0) return no('transaction does nothing')
  for (const instruction of instructions) {
    if (ALLOWED_PROGRAMS.has(instruction.program)) continue
    if (
      instruction.program === SPL_TOKEN_PROGRAM &&
      isWrappedSolCleanup({ instruction, publicKey, PublicKey })
    ) {
      continue
    }
    return no(`transaction calls an unexpected program (${instruction.program ?? 'unreadable'})`)
  }
  if (!instructions.some((i) => i.program === JUPITER_PROGRAM)) {
    return no('transaction contains no swap')
  }

  // It is a swap. Is it plausibly OUR swap? Both of the quote's token
  // accounts have to be named in it — see the header for how far that goes
  // and where it stops.
  if (!Array.isArray(expectedAccounts) || expectedAccounts.length === 0) {
    return no('nothing to check this transaction against')
  }
  const present = new Set(accounts)
  for (const account of expectedAccounts) {
    if (!present.has(account)) {
      return no('transaction does not touch the token accounts this trade needs')
    }
  }

  return ok
}
