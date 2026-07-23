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

/**
 * Quote a swap. side: 'buy' (USDC -> token) or 'sell' (token -> USDC).
 * amountRaw is in the INPUT mint's smallest units, as a string.
 * Returns Jupiter's quote plus normalized display fields.
 */
export async function getSwapQuote({ side, mint, amountRaw }) {
  const inputMint = side === 'buy' ? USDC_MINT : mint
  const outputMint = side === 'buy' ? mint : USDC_MINT
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amountRaw,
    slippageBps: String(SLIPPAGE_BPS),
  })
  const res = await fetch(`${QUOTE_BASE}?${params}`)
  if (!res.ok) throw new Error(`quote ${res.status}`)
  const quote = await res.json()
  if (!quote?.outAmount) throw new Error('no route')
  return quote
}

/**
 * Build, sign, and send the swap. The wallet does the signing and the
 * sending — we only deserialize Jupiter's unsigned transaction and hand it
 * over. Returns the transaction signature string.
 */
export async function executeSwap({ quote, provider }) {
  const publicKey = provider?.publicKey?.toString()
  if (!publicKey) throw new Error('wallet not connected')

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
  if (!res.ok) throw new Error(`swap build ${res.status}`)
  const { swapTransaction } = await res.json()
  if (!swapTransaction) throw new Error('no transaction returned')

  const { VersionedTransaction } = await import('@solana/web3.js')
  const tx = VersionedTransaction.deserialize(
    Uint8Array.from(atob(swapTransaction), (c) => c.charCodeAt(0))
  )

  // The moment of truth happens inside the wallet, not here.
  const { signature } = await provider.signAndSendTransaction(tx)
  track('swap_sent')
  return signature
}

/**
 * Scale a decimal amount to the mint's smallest units, as a string. BigInt
 * math (not float) so large/high-decimal amounts can't lose integer
 * precision above 2^53 and mis-size a transaction. Sub-unit fractional
 * digits are truncated — you can't send a fraction of the smallest unit.
 */
export function toRaw(amount, decimals) {
  const s = String(amount).trim()
  if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') return '0'
  const [intPart = '0', fracPart = ''] = s.split('.')
  const frac = (fracPart + '0'.repeat(decimals)).slice(0, decimals)
  return (BigInt(intPart || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')).toString()
}

export function fromRaw(raw, decimals) {
  return Number(raw) / 10 ** decimals
}
