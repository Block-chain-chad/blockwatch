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
// Honest about the limit: a browser cannot decode a Jupiter route and prove
// it pays out what the quote promised — the mints and pool accounts live in
// an address lookup table the page never fetches, and the real guarantee of
// the minimum received is enforced ON CHAIN by the swap program itself. What
// we CAN prove, and do prove here, is that the transaction is this user's,
// needs only this user's signature, calls nothing but programs we expect, and
// was built from a quote whose own numbers are internally consistent with the
// slippage bound printed on the screen. A tampered or mismatched response
// fails one of those.
//
// Every failure is a refusal to sign, which is always safe: nothing has been
// sent at that point.

// Programs a Jupiter swap is allowed to invoke AT THE TOP LEVEL. Checked
// against real lite-api.jup.ag transactions, both directions, one hop and
// two: compute budget (fee and unit limit), associated token (create the
// destination account), and the aggregator itself. That is the whole list.
//
// The SPL token programs and the system program are NOT on it, and their
// absence is the point. A swap does move tokens, but it moves them from
// INSIDE Jupiter — as inner instructions the aggregator issues under its own
// authority. A token transfer or a SOL transfer sitting at the top level,
// carrying the user's signature, is not something a swap needs and is exactly
// the shape a drainer takes: move the user's balance out, then add one
// Jupiter instruction so the transaction still looks like a trade. With those
// programs allowed, that transaction passed every other check here.
//
// If a route ever legitimately needs one of them at the top level — wrapping
// native SOL would — it gets added deliberately, with the reason written
// down, never because a response turned up asking for it.
export const JUPITER_PROGRAM = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'
export const ALLOWED_PROGRAMS = new Set([
  JUPITER_PROGRAM,
  'ComputeBudget111111111111111111111111111111',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
])

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
  const instructions = message.compiledInstructions ?? message.instructions ?? []
  return {
    feePayer: keys[0] ?? null,
    requiredSignatures: message.header?.numRequiredSignatures ?? null,
    // null for a program id that lives in a lookup table rather than in the
    // message — unresolvable here, and therefore not something we will sign.
    programs: instructions.map((i) => keys[i?.programIdIndex] ?? null),
  }
}

/**
 * Is this transaction safe to hand to the wallet?
 *
 * `build` is Jupiter's /swap response body; `tx` the deserialized
 * transaction; `publicKey` the connected wallet, base58.
 */
export function checkBuiltTransaction({ build, tx, publicKey }) {
  // Jupiter simulates the transaction it built. If it already knows the swap
  // fails, asking the user to sign it just burns their fee.
  if (build?.simulationError) {
    const detail = build.simulationError.error ?? build.simulationError.errorCode
    return { ok: false, reason: `Jupiter says this swap would fail (${detail})`, code: 'simulation' }
  }

  const { feePayer, requiredSignatures, programs } = describeTransaction(tx)
  if (requiredSignatures !== 1) {
    return no(`transaction wants ${requiredSignatures} signatures, not just yours`)
  }
  if (!publicKey) return no('no wallet to check the transaction against')
  if (feePayer !== publicKey) return no('transaction is not payable by your wallet')
  if (programs.length === 0) return no('transaction does nothing')
  for (const program of programs) {
    if (!ALLOWED_PROGRAMS.has(program)) {
      return no(`transaction calls an unexpected program (${program ?? 'unreadable'})`)
    }
  }
  if (!programs.includes(JUPITER_PROGRAM)) return no('transaction contains no swap')

  return ok
}
