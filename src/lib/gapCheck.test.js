import { describe, it, expect } from 'vitest'
import {
  gapCheck,
  sharesPerToken,
  liveAgrees,
  acceptLive,
  tokenUnitsNote,
  priceFooter,
  gapStatusLabel,
  MAX_PLAUSIBLE_GAP_PCT,
  TOKEN_PRICE_MAX_AGE_MS,
} from './gapCheck'
import { premiumPct, mergeAssets } from './prices'
import { widestCredibleGap } from './sessionCopy'
import { BY_ID } from '../data/universe'
import { networksFor } from './candles'

/*
 * The broken gaps seen on the live site on 2026-09-26, each replayed with the
 * prices measured that day, and what the app now shows for it. Every number
 * below is a real print: CoinGecko and Jupiter for the tokens, Yahoo for the
 * shares, Ondo's oracle for the sValues pinned in data/verifiedOndo.json.
 */

const NOW = Date.parse('2026-09-26T01:30:00Z')
const FRESH = NOW - 60_000

/** A real universe asset, merged the way the app merges it, then priced. */
function live(id, tokenPrice, stockPrice, over = {}) {
  const [merged] = mergeAssets([BY_ID[id]], {}, {})
  return { ...merged, tokenPrice, stockPrice, priceUpdatedAt: FRESH, volume24h: 1_000_000, ...over }
}

describe('ratios from the issuers', () => {
  it('reads Ondo sValues from the pinned oracle values', () => {
    expect(sharesPerToken(BY_ID['netflix-ondo-tokenized-stock'])).toBe(10)
    expect(sharesPerToken(BY_ID['crowdstrike-ondo-tokenized-stocks'])).toBe(4)
    expect(sharesPerToken(BY_ID['carvana-ondo-tokenized-stocks'])).toBe(5)
    // KLA pays a dividend, so its sValue creeps up from 10 between re-pins.
    const kla = sharesPerToken(BY_ID['kla-ondo-tokenized'])
    expect(kla).toBeGreaterThanOrEqual(10)
    expect(kla).toBeLessThan(10.5)
  })

  it('takes xStocks as per share only when the mint is pinned', () => {
    expect(sharesPerToken(BY_ID['netflix-xstock'])).toBe(1)
    expect(sharesPerToken(BY_ID['wrapped-apple-xstock'])).toBeNull()
  })

  it('verifies nobody else', () => {
    const bstock = Object.values(BY_ID).find((a) => a.issuer === 'bStocks' && a.underlying)
    expect(sharesPerToken(bstock)).toBeNull()
    expect(sharesPerToken({ issuer: 'Ondo', id: 'not-pinned', ticker: 'XYZon' })).toBeNull()
  })

  it("refuses an Ondo pin whose ticker no longer matches the asset's", () => {
    expect(sharesPerToken({ ...BY_ID['netflix-ondo-tokenized-stock'], ticker: 'NFLXonX' })).toBeNull()
  })
})

describe('the live cases, category (a): split ratios on Ondo', () => {
  const cases = [
    ['netflix-ondo-tokenized-stock', 711.12, 71.145], // was +900%
    ['kla-ondo-tokenized', 1892.33, 187.92], // was +907%
    ['abrdn-physical-platinum-shares-etf-ondo-tokenized', 160.7, 16.09], // was +899%
    ['carvana-ondo-tokenized-stocks', 326.42, 65.06], // was +402%
    ['crowdstrike-ondo-tokenized-stocks', 1014.6, 252.13], // was +302%
  ]
  it.each(cases)('%s reads as a small gap in share units', (id, token, share) => {
    const check = gapCheck(live(id, token, share), NOW)
    expect(check.status).toBe('ok')
    expect(Math.abs(check.gap)).toBeLessThan(1)
    // And it is not the raw ratio of prices any more.
    expect(Math.abs(token / share - 1) * 100).toBeGreaterThan(300)
  })
})

describe('the live cases, category (b): stale token prices', () => {
  it('PLx, last updated three months earlier, is not confirmed as a gap', () => {
    const plx = live('planet-labs-xstock', 25.95, 17.43, { priceUpdatedAt: Date.parse('2026-06-26T16:57:10Z') })
    expect(gapCheck(plx, NOW).status).toBe('price-check-failed')
    expect(gapStatusLabel(plx, NOW)).toBe('Gap not confirmed')
  })

  it('a price with no time on it is not a gap yet (old caches carry none)', () => {
    const a = live('netflix-xstock', 71.2, 71.145, { priceUpdatedAt: null })
    expect(gapCheck(a, NOW).status).toBe('pending')
    expect(gapCheck({ ...a, priceUpdatedAt: NaN }, NOW).status).toBe('pending')
    expect(gapStatusLabel(a, NOW)).toBeNull()
  })

  it('a price just inside a day old still counts', () => {
    const a = live('netflix-xstock', 71.2, 71.145, { priceUpdatedAt: NOW - TOKEN_PRICE_MAX_AGE_MS + 1000 })
    expect(gapCheck(a, NOW).status).toBe('ok')
  })
})

describe('the live cases, category (c): thin pools from the live Jupiter layer', () => {
  // Jupiter's price, CoinGecko's price, and the share.
  const cases = [
    ['AMDx', 518.689, 630.73, 630.63], // the header's "-17.75%"
    ['ASTSx', 187.359, 61.98, 61.81], // +203%
    ['ADBEx', 449.937, 239.16, 235.47], // +91%
    ['BACx', 65.576, 56.39, 56.7], // +15.65%
    ['JNJx', 234.471, 271.1, 271.22], // -13.55%
    ['CRWDx', 131.187, 260.4, 252.13], // -48%
  ]
  it.each(cases)('%s: the live price disagrees with CoinGecko, so it is not used', (_t, jup, cg) => {
    expect(liveAgrees(jup, cg)).toBe(false)
  })

  it('a healthy live price is used (NFLXx 71.29 against 70.97)', () => {
    expect(liveAgrees(71.294, 70.97)).toBe(true)
  })

  it('does not let a thin pool re-stamp a stale CoinGecko price as fresh', () => {
    // PLx: CoinGecko's 25.95 is three months old. A pool echoing it agrees,
    // but agreement with a stale number proves nothing.
    const stale = { feedPrice: 25.95, feedUpdatedAt: Date.parse('2026-06-26T16:57:10Z') }
    expect(liveAgrees(25.9, stale.feedPrice)).toBe(true)
    expect(acceptLive(25.9, stale, NOW)).toBe(false)
    expect(acceptLive(71.294, { feedPrice: 70.97, feedUpdatedAt: NOW - 120_000 }, NOW)).toBe(true)
    expect(acceptLive(71.294, { feedPrice: 70.97, feedUpdatedAt: null }, NOW)).toBe(false)
  })

  it('refuses a live price with nothing to check it against', () => {
    expect(liveAgrees(100, null)).toBe(false)
    expect(liveAgrees(0, 100)).toBe(false)
  })
})

describe('plausibility bound', () => {
  it('shows a gap up to the bound and refuses one past it', () => {
    expect(gapCheck(live('netflix-xstock', 71.145 * 1.19, 71.145), NOW).status).toBe('ok')
    expect(gapCheck(live('netflix-xstock', 71.145 * 1.21, 71.145), NOW).status).toBe('price-check-failed')
    expect(gapCheck(live('netflix-xstock', 71.145 * 0.79, 71.145), NOW).status).toBe('price-check-failed')
    expect(MAX_PLAUSIBLE_GAP_PCT).toBe(20)
  })

  it('catches a split the pin has not caught up with (a 3-for-2 is +50%)', () => {
    expect(gapCheck(live('netflix-xstock', 150, 100), NOW).status).toBe('price-check-failed')
  })
})

// premiumPct and widestCredibleGap read the real clock, so these rows are
// fresh (or stale) relative to it rather than to NOW.
const realFresh = () => ({ priceUpdatedAt: Date.now() - 60_000 })

describe('what everything downstream sees', () => {
  it('premiumPct is null for every refused verdict, so nothing can rank it', () => {
    const bstock = Object.values(BY_ID).find((a) => a.issuer === 'bStocks' && a.underlying)
    const unverified = live(bstock.id, 200, 100, realFresh())
    expect(premiumPct(unverified)).toBeNull()
    expect(gapStatusLabel(unverified)).toBe('Ratio unverified')
    expect(premiumPct(live('netflix-xstock', 150, 100, realFresh()))).toBeNull()
  })

  it('reports pending and none without a label', () => {
    expect(gapCheck(live('netflix-xstock', null, 71), NOW).status).toBe('pending')
    expect(gapCheck({ underlying: null }, NOW).status).toBe('none')
    expect(gapStatusLabel({ underlying: null })).toBeNull()
  })

  it('never names an unverified, stale or implausible row as the widest gap', () => {
    const bstock = Object.values(BY_ID).find((a) => a.issuer === 'bStocks' && a.underlying)
    const assets = [
      live('netflix-xstock', 71.5, 71.145, realFresh()), // +0.5%, real
      live(bstock.id, 110, 100, realFresh()), // +10% but unverified
      live('planet-labs-xstock', 18.9, 17.43, { priceUpdatedAt: Date.now() - 3 * TOKEN_PRICE_MAX_AGE_MS }), // stale
      live('adobe-xstock', 190, 235.47, realFresh()), // -19%, plausible and would win
    ]
    const top = widestCredibleGap(assets, 'closed')
    expect(top.asset.ticker).toBe('ADBEx')
    const withoutAdobe = widestCredibleGap(assets.slice(0, 3), 'closed')
    expect(withoutAdobe.asset.ticker).toBe('NFLXx')
  })
})

describe('units copy', () => {
  const fmt = (n) => `$${n.toFixed(2)}`

  it('labels a token drawn per share, and a token with no line', () => {
    expect(tokenUnitsNote(live('netflix-ondo-tokenized-stock', 711.12, 71.145))).toBe(
      'Token scaled per share (1 NFLXon tracks 10 shares)',
    )
    expect(tokenUnitsNote(live('netflix-xstock', 71.2, 71.145))).toBeNull()
    const bstock = Object.values(BY_ID).find((a) => a.issuer === 'bStocks' && a.underlying)
    expect(tokenUnitsNote(live(bstock.id, 100, 100))).toBe('Token not drawn: ratio unverified')
    expect(tokenUnitsNote({ underlying: null })).toBeNull()
  })

  it('never prints raw token and share prices side by side without the unit or the reason', () => {
    expect(priceFooter(live('netflix-ondo-tokenized-stock', 711.12, 71.145, realFresh()), fmt)).toEqual([
      'Token $711.12 ($71.11 per share tracked)',
      'Stock $71.14',
    ])
    const bstock = Object.values(BY_ID).find((a) => a.issuer === 'bStocks' && a.underlying)
    expect(priceFooter(live(bstock.id, 1014.6, 252.13, realFresh()), fmt)).toEqual([
      'Token $1014.60',
      'Stock $252.13',
      'Ratio unverified',
    ])
    expect(priceFooter(live('netflix-xstock', 150, 100, realFresh()), fmt)).toEqual([
      'Token $150.00',
      'Stock $100.00',
      'Gap not confirmed',
    ])
  })
})

/*
 * One division, never two. Ondo's docs describe "display scaling" on some
 * chains: the balance is shown multiplied by sValue and the price divided by
 * it. Measured 2026-09-26 for NFLXon (sValue 10):
 *   - Solana (Token-2022 scaled UI, g4Kn...ondo): Jupiter quotes 75.99 per
 *     displayed unit, 759.88 "prescaled". Display-scaled.
 *   - CoinGecko 711.12, built from exchange tickers (LBank 720.32, MEXC
 *     710.60, Gate 721.61), all per whole token. Not display-scaled.
 *   - GeckoTerminal's Ethereum pool: 785.53 per ERC-20 token. Not scaled.
 * The app prices Ondo only from CoinGecko and draws Ondo candles only from
 * Ethereum pools, both per whole token, so dividing by sValue once is right.
 * These tests pin the two facts that keep it that way.
 */
describe('Ondo prices arrive per whole token, so sValue is applied once', () => {
  it('an Ondo token has no Solana mint in the universe, so the Jupiter layer never prices it', () => {
    const ondo = Object.values(BY_ID).filter((a) => a.issuer === 'Ondo')
    expect(ondo.length).toBeGreaterThan(400)
    expect(ondo.filter((a) => a.mint)).toEqual([])
  })

  it('Ondo candles come from Ethereum pools only', () => {
    expect(networksFor(BY_ID['netflix-ondo-tokenized-stock'])).toEqual(['eth'])
  })

  it("the measured CoinGecko price over the share is NFLXon's sValue, not 1", () => {
    const ratio = 711.12 / 71.145
    expect(ratio).toBeCloseTo(sharesPerToken(BY_ID['netflix-ondo-tokenized-stock']), 0)
    // A double division would read about -90%, which the bound refuses.
    const twice = gapCheck(live('netflix-ondo-tokenized-stock', 711.12 / 10, 71.145), NOW)
    expect(twice.status).toBe('price-check-failed')
  })
})
