// Non-custodial swap execution — phase two of the trading ladder. Jupiter
// quotes the route and builds the transaction; the USER's wallet signs and
// sends it. BlockWatch never touches funds, keys, or the transaction after
// handing it to the wallet. NO platform fee is attached anywhere in this
// module — that switch stays off until the legal side exists.
//
// @solana/web3.js is imported dynamically so its weight only loads when a
// swap sheet actually opens.

import { track } from './analytics'

const QUOTE_BASE = 'https://lite-api.jup.ag/swap/v1/quote'
const SWAP_BASE = 'https://lite-api.jup.ag/swap/v1/swap'

export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const USDC_DECIMALS = 6
const SLIPPAGE_BPS = 50 // 0.5% — shown to the user as the worst-case bound
// Jupiter's quote endpoint normally answers well under a second. 12s is long
// enough to survive a bad mobile connection, and short enough that it always
// resolves before the sheet's next 8s refresh has been waiting a full extra
// cycle — so the "Quoting…" state can never sit there forever on a hung
// request while Confirm stays live against an ageing quote.
const QUOTE_TIMEOUT_MS = 12_000

/**
 * Quote a swap. side: 'buy' (USDC -> token) or 'sell' (token -> USDC).
 * amountRaw is in the INPUT mint's smallest units, as a string.
 * Returns Jupiter's quote plus normalized display fields.
 *
 * Always settles: a hung request aborts at QUOTE_TIMEOUT_MS and throws an
 * error carrying `code === 'timeout'` so the UI can say so specifically
 * instead of blaming the amount.
 */
export async function getSwapQuote({ side, mint, amountRaw, timeoutMs = QUOTE_TIMEOUT_MS }) {
  const inputMint = side === 'buy' ? USDC_MINT : mint
  const outputMint = side === 'buy' ? mint : USDC_MINT
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
  return quote
}

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
 */
export async function executeSwap({ quote, provider }) {
  const publicKey = provider?.publicKey?.toString()
  if (!publicKey) throw swapError('wallet not connected', 'build')

  let swapTransaction
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
    const body = await res.json()
    swapTransaction = body?.swapTransaction
  } catch (err) {
    // Offline, DNS failure, non-JSON body… still strictly pre-broadcast:
    // the wallet has not been asked for anything yet.
    if (err?.phase) throw err
    throw swapError(`could not reach Jupiter: ${err?.message ?? err}`, 'build')
  }
  if (!swapTransaction) throw swapError('no transaction returned', 'build')

  let tx
  try {
    const { VersionedTransaction } = await import('@solana/web3.js')
    tx = VersionedTransaction.deserialize(
      Uint8Array.from(atob(swapTransaction), (c) => c.charCodeAt(0))
    )
  } catch (err) {
    throw swapError(`could not read the transaction: ${err?.message ?? err}`, 'build')
  }

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
    throw tagged
  }
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

export function fromRaw(raw, decimals) {
  return Number(raw) / 10 ** decimals
}
