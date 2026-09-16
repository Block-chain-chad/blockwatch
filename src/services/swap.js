// Non-custodial swap execution — phase two of the trading ladder. Jupiter
// quotes the route and builds the transaction; the USER's wallet signs and
// sends it. OnStock never touches funds, keys, or the transaction after
// handing it to the wallet. NO platform fee is attached anywhere in this
// module — that switch stays off until the legal side exists.
//
// @solana/web3.js is imported dynamically so its weight only loads when a
// swap sheet actually opens.

import { track } from './analytics'
import { recordSwap, swapKey } from './swapAudit'
import { checkQuote, checkBuiltTransaction } from '../lib/swapCheck'

const QUOTE_BASE = 'https://lite-api.jup.ag/swap/v1/quote'
const SWAP_BASE = 'https://lite-api.jup.ag/swap/v1/swap'

export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const USDC_DECIMALS = 6
export const SLIPPAGE_BPS = 50 // 0.5% — shown to the user as the worst-case bound
// Jupiter's quote endpoint normally answers well under a second. 12s is long
// enough to survive a bad mobile connection, and short enough that it always
// resolves before the sheet's next 8s refresh has been waiting a full extra
// cycle — so the "Quoting…" state can never sit there forever on a hung
// request while Confirm stays live against an ageing quote.
const QUOTE_TIMEOUT_MS = 12_000

/** Which way round the mints go for a side. One definition, used everywhere. */
export function swapMints({ side, mint }) {
  return side === 'buy'
    ? { inputMint: USDC_MINT, outputMint: mint }
    : { inputMint: mint, outputMint: USDC_MINT }
}

/**
 * Quote a swap. side: 'buy' (USDC -> token) or 'sell' (token -> USDC).
 * amountRaw is in the INPUT mint's smallest units, as a string.
 * Returns Jupiter's quote plus normalized display fields.
 *
 * Always settles: a hung request aborts at QUOTE_TIMEOUT_MS and throws an
 * error carrying `code === 'timeout'` so the UI can say so specifically
 * instead of blaming the amount.
 *
 * A quote that does not describe the trade we asked for is thrown away here
 * rather than displayed — the number beside "Minimum received" is a promise,
 * and we only make it for a quote whose own arithmetic holds up.
 */
export async function getSwapQuote({ side, mint, amountRaw, timeoutMs = QUOTE_TIMEOUT_MS }) {
  const { inputMint, outputMint } = swapMints({ side, mint })
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amountRaw,
    slippageBps: String(SLIPPAGE_BPS),
  })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res
  try {
    res = await fetch(`${QUOTE_BASE}?${params}`, { signal: controller.signal })
  } catch (err) {
    if (controller.signal.aborted) {
      const e = new Error('quote timed out')
      e.code = 'timeout'
      throw e
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new Error(`quote ${res.status}`)
  const quote = await res.json()
  if (!quote?.outAmount) throw new Error('no route')
  const verdict = checkQuote({
    quote,
    inputMint,
    outputMint,
    amountRaw,
    slippageBps: SLIPPAGE_BPS,
  })
  if (!verdict.ok) throw new Error(`unusable quote: ${verdict.reason}`)
  return quote
}

// Swaps handed to the wallet and not yet answered for, by idempotency key.
// Module scope, not React state: a second Confirm arriving in the same tick
// as the first sees this immediately, where a state update has not landed
// yet. Cleared in a finally, so a finished or failed swap can be retried.
const inFlight = new Set()

/**
 * Every error out of executeSwap carries a `phase` so the UI can tell the user
 * the truth about their money:
 *   'build'     — nothing was ever handed to the wallet. Nothing was sent,
 *                 nothing left the wallet, retrying is safe.
 *   'broadcast' — the wallet was asked to sign and send. The transaction may
 *                 already be on-chain even though we never saw a result, so
 *                 the UI must NOT claim it failed.
 * An error with no phase is treated by the UI as possibly-broadcast (the
 * cautious default) UNLESS its message matches the user-cancelled heuristic —
 * see the catch in overlays/SwapSheet.jsx for the exact precedence. Every
 * error thrown from executeSwap below is tagged, so that only applies to
 * errors originating elsewhere.
 */
function swapError(message, phase) {
  const e = new Error(message)
  e.phase = phase
  return e
}

/**
 * Build, sign, and send the swap. The wallet does the signing and the
 * sending — we only deserialize Jupiter's unsigned transaction and hand it
 * over. Returns the transaction signature string.
 *
 * `intent` is what the USER asked for — { side, mint, amountRaw, ticker } —
 * and it is the authority here, not the quote. The quote is re-checked
 * against it, and the built transaction is checked against the wallet, before
 * anything reaches Phantom. A quote object that drifted, was swapped out, or
 * came back altered never gets signed.
 *
 * Two swaps with the same intent from the same wallet cannot be in flight at
 * once: the second is refused in phase 'build', so a double tap or a double
 * event listener cannot spend the money twice.
 */
export async function executeSwap({ quote, provider, intent }) {
  const publicKey = provider?.publicKey?.toString()
  if (!publicKey) throw swapError('wallet not connected', 'build')
  if (!intent?.mint || !intent?.amountRaw || !intent?.side) {
    throw swapError('swap is missing what the user asked for', 'build')
  }

  const { inputMint, outputMint } = swapMints(intent)
  const verdict = checkQuote({
    quote,
    inputMint,
    outputMint,
    amountRaw: intent.amountRaw,
    slippageBps: SLIPPAGE_BPS,
  })
  if (!verdict.ok) throw swapError(`quote does not match this trade: ${verdict.reason}`, 'build')

  const key = swapKey({
    wallet: publicKey,
    side: intent.side,
    mint: intent.mint,
    amountRaw: intent.amountRaw,
  })
  if (inFlight.has(key)) {
    // Worth a record of its own: a repeat that got this far is the exact
    // event a double-submit bug produces.
    recordSwap('blocked', { key, wallet: publicKey, reason: 'already in flight' })
    throw swapError('this swap is already waiting in your wallet', 'build')
  }
  inFlight.add(key)
  try {
    return await submit({ quote, provider, intent, publicKey, key, inputMint, outputMint })
  } catch (err) {
    // Everything that failed before the wallet saw it. The post-wallet cases
    // record themselves inside submit, where the ambiguity is known.
    if (err?.phase === 'build') {
      recordSwap('failed', { key, wallet: publicKey, reason: err.message })
    }
    throw err
  } finally {
    inFlight.delete(key)
  }
}

async function submit({ quote, provider, intent, publicKey, key, inputMint, outputMint }) {
  let body
  try {
    const res = await fetch(SWAP_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: publicKey,
        dynamicComputeUnitLimit: true,
        dynamicSlippage: false,
      }),
    })
    if (!res.ok) throw swapError(`swap build ${res.status}`, 'build')
    body = await res.json()
  } catch (err) {
    // Offline, DNS failure, non-JSON body… still strictly pre-broadcast:
    // the wallet has not been asked for anything yet.
    if (err?.phase) throw err
    throw swapError(`could not reach Jupiter: ${err?.message ?? err}`, 'build')
  }
  if (!body?.swapTransaction) throw swapError('no transaction returned', 'build')

  let tx
  try {
    const { VersionedTransaction } = await import('@solana/web3.js')
    tx = VersionedTransaction.deserialize(
      Uint8Array.from(atob(body.swapTransaction), (c) => c.charCodeAt(0))
    )
  } catch (err) {
    throw swapError(`could not read the transaction: ${err?.message ?? err}`, 'build')
  }

  // Last gate before the wallet. Still phase 'build': refusing here means
  // nothing was sent.
  const built = checkBuiltTransaction({ build: body, tx, publicKey })
  if (!built.ok) {
    const err = swapError(built.reason, 'build')
    err.code = built.code
    throw err
  }

  // On the record BEFORE the wallet is asked, so an outcome we never see is
  // still traceable to the exact trade that caused it.
  const attempt = {
    key,
    wallet: publicKey,
    side: intent.side,
    ticker: intent.ticker ?? null,
    inputMint,
    outputMint,
    amountRaw: intent.amountRaw,
    quotedOutRaw: quote.outAmount,
    minOutRaw: quote.otherAmountThreshold,
    slippageBps: SLIPPAGE_BPS,
    // Jupiter's own decimal string — never a float, never rounded by us.
    priceImpactPct: quote.priceImpactPct ?? null,
  }
  recordSwap('submitted', attempt)

  // The moment of truth happens inside the wallet, not here. Past this line a
  // failure is ambiguous: signAndSendTransaction broadcasts before it can time
  // out, so the swap may be on-chain regardless of what we get back.
  let signature
  try {
    const sent = await provider.signAndSendTransaction(tx)
    signature = sent.signature
  } catch (err) {
    // Re-tag while preserving the wallet's own `code` and `message` — the
    // 4001 "user rejected" check in the UI depends on both surviving.
    const tagged = swapError(err?.message ?? 'swap failed', 'broadcast')
    tagged.code = err?.code
    tagged.cause = err
    // A wallet that says 4001 declined it; anything else may already be on
    // chain, and the record must say so rather than guess.
    recordSwap(err?.code === 4001 ? 'rejected' : 'unknown', {
      key,
      wallet: publicKey,
      reason: err?.message ?? 'wallet threw',
      walletCode: err?.code ?? null,
    })
    throw tagged
  }
  recordSwap('sent', { key, wallet: publicKey, signature })
  track('swap_sent')
  return signature
}

// Largest exponent we'll expand. Any real trade is many orders of magnitude
// below this; the cap only stops "1e1000000000" from asking for a
// gigabyte-long digit string.
const MAX_EXPONENT = 1000

/**
 * Rewrite exponent notation as plain decimal digits, using string math only —
 * no Number round-trip, so "1.2345678901234567890e10" keeps every digit.
 * Returns null when `s` isn't exponent form (or is absurdly out of range).
 *
 * <input type="number"> accepts "1e5" as a valid value (HTML's
 * value-sanitization algorithm), it's typeable on desktop and pasteable on
 * iOS, and it means 100000 — not "too small".
 */
function expandExponent(s) {
  const m = /^(\d*)(?:\.(\d*))?[eE]([+-]?\d+)$/.exec(s)
  if (!m) return null
  const [, intRaw, fracRaw = '', expRaw] = m
  const intPart = intRaw ?? ''
  // "e5" and ".e5" carry no digits — not a number.
  if (intPart === '' && fracRaw === '') return null
  const exp = Number(expRaw)
  if (!Number.isSafeInteger(exp) || Math.abs(exp) > MAX_EXPONENT) return null

  const digits = intPart + fracRaw
  // Where the decimal point lands inside `digits` after shifting by `exp`.
  const point = intPart.length + exp
  if (point <= 0) return `0.${'0'.repeat(-point)}${digits}`
  if (point >= digits.length) return digits + '0'.repeat(point - digits.length)
  return `${digits.slice(0, point)}.${digits.slice(point)}`
}

/**
 * Scale a decimal amount to the mint's smallest units, as a string. BigInt
 * math (not float) so large/high-decimal amounts can't lose integer
 * precision above 2^53 and mis-size a transaction. Sub-unit fractional
 * digits are truncated — you can't send a fraction of the smallest unit.
 *
 * Returns '0' for anything it can't read; callers treat that as "too small
 * to swap". Throws only if `decimals` is not a sane non-negative integer,
 * which callers must guard (upstream data is not trusted).
 */
export function toRaw(amount, decimals) {
  let s = String(amount).trim()
  const expanded = expandExponent(s)
  if (expanded !== null) s = expanded
  if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') return '0'
  const [intPart = '0', fracPart = ''] = s.split('.')
  const frac = (fracPart + '0'.repeat(decimals)).slice(0, decimals)
  return (BigInt(intPart || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')).toString()
}

/**
 * Render a smallest-units amount for display, exactly. String math, so the
 * number a user reads is the number that was quoted — a float round-trip
 * turns 2879213 units of an 8-decimal token into 0.02879213 only by luck,
 * and the "minimum received" line is a promise, not a decoration.
 *
 * Truncates rather than rounds: never show more than the trade guarantees.
 * A value too small for `maxFractionDigits` keeps going until it shows
 * `significantDigits` real digits, so dust reads as 0.000012 and not "0".
 * Returns null for anything that isn't a whole number of units.
 */
export function formatRaw(raw, decimals, { maxFractionDigits = 4, significantDigits = 2 } = {}) {
  if (!Number.isSafeInteger(decimals) || decimals < 0) return null
  const s = String(raw ?? '').trim()
  if (!/^\d+$/.test(s)) return null

  const padded = s.padStart(decimals + 1, '0')
  const cut = padded.length - decimals
  const intPart = padded.slice(0, cut)
  const fracPart = padded.slice(cut)

  let keep = maxFractionDigits
  if (intPart === '0') {
    const firstSignificant = fracPart.search(/[1-9]/)
    if (firstSignificant >= 0) keep = Math.max(keep, firstSignificant + significantDigits)
  }
  const frac = fracPart.slice(0, keep).replace(/0+$/, '')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac ? `${grouped}.${frac}` : grouped
}
