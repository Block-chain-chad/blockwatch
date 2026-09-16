import { describe, it, expect } from 'vitest'
import { sellAmountRaw, formatWallet, toRaw, formatRaw, SLIPPAGE_BPS, USDC_MINT, USDC_DECIMALS, swapMints } from './swap'
import { checkQuote } from '../lib/swapCheck'
import { effectiveMultiplier } from '../lib/multiplier'
import { VERIFIED_MINTS } from '../data/verifiedMints'

/*
 * The unit boundary on the swap sheet, where getting it wrong costs money.
 *
 * A user reads their balance off Phantom. Phantom shows the WALLET amount —
 * raw/10^decimals scaled by the issuer's multiplier, which the issuer means
 * to be a share count. Jupiter quotes and the transaction are sized in RAW.
 * For 66 of the 103 pinned mints those are different numbers, and for NFLXx
 * they differ by ten times.
 *
 * Ratios read off Solana mainnet on 2026-09-16, all with 8 decimals:
 *   NFLXx  10                   CRWDx 4
 *   TQQQx  2.008976295242212    AZNx  0.5111362527152737
 *   TSLAx  1
 */
const DECIMALS = 8
const NFLX = '10'
const CRWD = '4'
const TQQQ = '2.008976295242212'
const AZN = '0.5111362527152737'
const ONE = '1'

describe('sellAmountRaw — the typed figure is what the wallet shows, not base units', () => {
  it('sells one NFLXx as one NFLXx, not ten', () => {
    // Before: toRaw('1', 8) = 100000000 raw, which the chain reads as ten
    // NFLXx once the 10x ratio is applied. The user asked for one.
    expect(sellAmountRaw('1', DECIMALS, NFLX)).toBe('10000000')
    expect(sellAmountRaw('1', DECIMALS, NFLX)).not.toBe(toRaw('1', DECIMALS))
  })

  it('sells one CRWDx as one CRWDx', () => {
    expect(sellAmountRaw('1', DECIMALS, CRWD)).toBe('25000000')
  })

  it('handles the TQQQx ratio exactly', () => {
    // 10^8 / 2.008976295242212 = 49776595.29..., truncated.
    expect(sellAmountRaw('1', DECIMALS, TQQQ)).toBe('49776595')
  })

  it('handles the one ratio below 1, where the old code UNDER-sold', () => {
    // AZNx at 0.5111: the old path sent 100000000 raw, which the wallet
    // counts as 0.511 AZNx — about half what was asked for.
    expect(sellAmountRaw('1', DECIMALS, AZN)).toBe('195642550')
  })

  it('changes nothing for the 37 mints the issuer left at 1.0', () => {
    expect(sellAmountRaw('12.5', DECIMALS, ONE)).toBe(toRaw('12.5', DECIMALS))
    expect(sellAmountRaw('12.5', DECIMALS, ONE)).toBe('1250000000')
  })

  it('keeps fractional amounts exact', () => {
    expect(sellAmountRaw('0.25', DECIMALS, NFLX)).toBe('2500000')
    expect(sellAmountRaw('2.5', DECIMALS, CRWD)).toBe('62500000')
  })

  it('never rounds up — a truncated sell is smaller than asked, never larger', () => {
    const asked = 100000000n // 1 token, 8 decimals
    for (const m of [NFLX, CRWD, TQQQ, AZN]) {
      const raw = BigInt(sellAmountRaw('1', DECIMALS, m))
      // Scaling it back must not exceed what the user asked to sell.
      const backScaled = (raw * BigInt(m.replace('.', ''))) / 10n ** BigInt((m.split('.')[1] ?? '').length)
      expect(backScaled <= asked, `${m} oversold`).toBe(true)
    }
  })

  it('reports "too small" rather than a silent zero-size trade', () => {
    expect(sellAmountRaw('0.000000001', DECIMALS, NFLX)).toBe('0')
  })

  it('refuses a ratio it cannot read, instead of falling back to 1', () => {
    expect(sellAmountRaw('1', DECIMALS, 'bad')).toBeNull()
    expect(sellAmountRaw('1', DECIMALS, undefined)).toBeNull()
    expect(sellAmountRaw('1', null, NFLX)).toBeNull()
  })
})

describe('formatWallet — the sheet promises the number Phantom will show', () => {
  it('scales a NFLXx buy up by ten', () => {
    // Measured live 2026-09-16: $100 of NFLXx quoted 12905000 raw units. The
    // sheet used to print 0.129 for a trade Phantom reports as 1.29.
    expect(formatWallet('12905000', DECIMALS, NFLX)).toBe('1.2905')
    expect(formatRaw('12905000', DECIMALS)).toBe('0.129')
  })

  it('scales a CRWDx buy', () => {
    expect(formatWallet('6670000', DECIMALS, CRWD)).toBe('0.2668')
  })

  it('scales an AZNx buy down, since its ratio is below one', () => {
    expect(formatWallet('118330000', DECIMALS, AZN)).toBe('0.6048')
  })

  it('changes nothing at a ratio of 1, including for the USDC leg of a sell', () => {
    expect(formatWallet('313940000', USDC_DECIMALS, ONE)).toBe('313.94')
    expect(formatWallet('313940000', USDC_DECIMALS, ONE)).toBe(formatRaw('313940000', USDC_DECIMALS))
  })

  it('shows a dash rather than a number in the wrong unit', () => {
    expect(formatWallet('12905000', DECIMALS, 'bad')).toBeNull()
  })
})

/*
 * The invariant executeSwap depends on: the amount used to QUOTE is the amount
 * stated as the INTENT, so checkQuote can hold one against the other. The
 * multiplier conversion happens once, before quoting, and both sides of that
 * check see the same raw figure afterwards.
 */
describe('the intent and the quote stay in the same unit', () => {
  const mint = 'XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL' // NFLXx

  /** A Jupiter-shaped quote for a sell of `amountRaw` of the token. */
  const quoteFor = (amountRaw) => {
    const out = (BigInt(amountRaw) * 764n) / 100n // any plausible USDC proceeds
    return {
      inputMint: mint,
      outputMint: USDC_MINT,
      swapMode: 'ExactIn',
      inAmount: amountRaw,
      outAmount: out.toString(),
      otherAmountThreshold: ((out * BigInt(10_000 - SLIPPAGE_BPS)) / 10_000n).toString(),
      slippageBps: SLIPPAGE_BPS,
    }
  }

  it('accepts the quote when both came from the converted amount', () => {
    const amountRaw = sellAmountRaw('1', DECIMALS, NFLX)
    const { inputMint, outputMint } = swapMints({ side: 'sell', mint })
    const verdict = checkQuote({
      quote: quoteFor(amountRaw),
      inputMint,
      outputMint,
      amountRaw,
      slippageBps: SLIPPAGE_BPS,
    })
    expect(verdict.ok, verdict.reason).toBe(true)
  })

  it('rejects a quote built from the UNCONVERTED amount — the old bug, caught', () => {
    // If the conversion were applied to only one of the two, the amounts
    // disagree by the multiplier and executeSwap refuses to send anything.
    const converted = sellAmountRaw('1', DECIMALS, NFLX)
    const { inputMint, outputMint } = swapMints({ side: 'sell', mint })
    const verdict = checkQuote({
      quote: quoteFor(toRaw('1', DECIMALS)), // quoted in base units by mistake
      inputMint,
      outputMint,
      amountRaw: converted,
      slippageBps: SLIPPAGE_BPS,
    })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toMatch(/spends a different amount/)
  })
})

describe('the ratios this all rests on are really in the pinned file', () => {
  const ratioFor = (id) => effectiveMultiplier(VERIFIED_MINTS[id])

  it('NFLXx is pinned at 10 after its split', () => {
    expect(ratioFor('netflix-xstock')).toBe('10')
  })

  it('AZNx is pinned below one', () => {
    expect(Number(ratioFor('astrazeneca-xstock'))).toBeLessThan(1)
  })

  it('TSLAx is pinned at exactly one, so its swap sheet is unchanged', () => {
    expect(ratioFor('tesla-xstock')).toBe('1')
  })

  it('every pinned mint has 8 decimals, which these fixtures assume', () => {
    for (const m of Object.values(VERIFIED_MINTS)) expect(m.decimals).toBe(DECIMALS)
  })
})
