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
//   - every top-level instruction calls a program we expect;
//   - it contains a Jupiter instruction, so it is a swap at all;
//   - it touches the user's associated token accounts for BOTH of the mints
//     the quote names. Those two addresses are derived here from the quote
//     and looked for in message.staticAccountKeys — where they really do
//     live, because a user-specific account cannot sit in one of Jupiter's
//     shared lookup tables. A transaction built for a different pair of mints
//     than the one we quoted and showed the user is therefore refused.
// And on the quote itself: its own numbers are internally consistent with the
// slippage bound printed on the screen.
//
// NATIVE SOL is deliberately out of scope. services/swap.js only ever trades
// USDC against a verified xStocks mint, so neither leg is ever the native
// mint and there is no wrapped-SOL account to account for. If a native SOL
// leg is ever added, its wrapped-SOL account must be added to this check at
// the same time, or the check will refuse every such swap.
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
  const instructions = message.compiledInstructions ?? message.instructions ?? []
  return {
    feePayer: keys[0] ?? null,
    requiredSignatures: message.header?.numRequiredSignatures ?? null,
    // Every account the message itself names. Lookup-table entries are not in
    // here, which is exactly why the accounts we go looking for are ones that
    // cannot live in a lookup table (see the header).
    accounts: keys,
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
 *
 * `expectedAccounts` is what ties the transaction to the quote: the token
 * accounts this exact trade has to touch, derived from the quote's mints by
 * associatedTokenAddress. It is REQUIRED — a caller that omits it gets a
 * refusal, never a quiet pass, because a check that no-ops when it is not
 * configured is worse than no check at all.
 */
export function checkBuiltTransaction({ build, tx, publicKey, expectedAccounts }) {
  // Jupiter simulates the transaction it built. If it already knows the swap
  // fails, asking the user to sign it just burns their fee.
  if (build?.simulationError) {
    const detail = build.simulationError.error ?? build.simulationError.errorCode
    return { ok: false, reason: `Jupiter says this swap would fail (${detail})`, code: 'simulation' }
  }

  const { feePayer, requiredSignatures, programs, accounts } = describeTransaction(tx)
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

  // It is a swap. Is it OUR swap? Both of the quote's token accounts have to
  // appear in it, or Jupiter built a trade in a different pair of mints than
  // the one the user read on the screen.
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
