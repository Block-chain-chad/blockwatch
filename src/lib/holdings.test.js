import { describe, it, expect } from 'vitest'
import {
  parseAmount,
  toUnits,
  isAddable,
  cleanHoldings,
  summarize,
  coverageLines,
  formatUsd,
  formatMove,
  formatAmount,
  dollarGap,
  dollarGapSentence,
  mergeGuest,
  importQuestion,
  skippedNotice,
  alreadyHeld,
  HOLDINGS_LIMIT,
} from './holdings'
import { BY_ID } from '../data/universe'
import { VERIFIED_MINTS } from '../data/verifiedMints'
import { VERIFIED_ONDO } from '../data/verifiedOndo'

/*
 * Holdings money math (brief section 5) and the sentences built from it.
 * The two worked examples are the brief's own: an xStocks holding, and an
 * Ondo token that tracks ten shares, where a units mistake would overstate
 * the value tenfold.
 */

const NOW = Date.parse('2026-09-30T15:00:00Z') // a Wednesday, market open
const FRESH = NOW - 60_000

const asset = (over) => ({
  id: 'nvidia-xstock',
  ticker: 'NVDAx',
  name: 'NVIDIA',
  issuer: 'xStocks',
  underlying: 'NVDA',
  tokenPrice: 181.24,
  stockPrice: 180.83,
  sharesPerToken: 1,
  dayChange: 0.5,
  priceUpdatedAt: FRESH,
  stockQuote: { asOf: FRESH },
  ...over,
})
const ondo = (over) =>
  asset({ id: 'x-ondo', ticker: 'XON', name: 'X Corp', issuer: 'Ondo', underlying: 'X', tokenPrice: 705, stockPrice: 70, sharesPerToken: 10, ...over })

const units = (s) => toUnits(s)
const usd = (u) => formatUsd(u)

describe('parseAmount', () => {
  it('accepts digits and one decimal point, and cleans them', () => {
    expect(parseAmount('12.5')).toBe('12.5')
    expect(parseAmount(' 1 0 ')).toBe('10')
    expect(parseAmount('0010.500')).toBe('10.5')
    expect(parseAmount('.5')).toBe('0.5')
    expect(parseAmount('7.')).toBe('7')
    expect(parseAmount('0.123456789012345678')).toBe('0.123456789012345678')
    expect(parseAmount('999999999999')).toBe('999999999999')
  })

  it('refuses everything else', () => {
    for (const bad of ['', '.', '0', '0.000', '-1', '+1', '1,000', '1e3', 'abc', '1.2.3', '0.1234567890123456789', '1000000000000', '999999999999.5', null]) {
      expect(parseAmount(bad), String(bad)).toBeNull()
    }
  })
})

describe('isAddable', () => {
  it('takes xStocks with a verified mint and Ondo with a verified ratio only', () => {
    const x = BY_ID[Object.keys(VERIFIED_MINTS)[0]]
    const o = BY_ID[Object.keys(VERIFIED_ONDO).find((id) => BY_ID[id] && !VERIFIED_ONDO[id].paused && VERIFIED_ONDO[id].ticker === BY_ID[id].ticker)]
    expect(isAddable(x)).toBe(true)
    expect(isAddable(o)).toBe(true)
    const b = Object.values(BY_ID).find((a) => a.issuer === 'bStocks')
    expect(isAddable(b)).toBe(false)
    expect(isAddable({ id: 'nope', issuer: 'xStocks', ticker: 'NOPEx' })).toBe(false)
    expect(isAddable(Object.values(BY_ID).find((a) => a.issuer === 'Other'))).toBe(false)
  })
})

describe('cleanHoldings', () => {
  it('keeps well-formed rows, one per token, up to the limit', () => {
    const raw = [
      { assetId: 'a', amount: '1', updatedAt: 5 },
      { assetId: 'a', amount: '2' },
      { assetId: 'b', amount: '-1' },
      { assetId: 'bad id"', amount: '1' },
      { assetId: 'c', amount: 3 },
      null,
    ]
    expect(cleanHoldings(raw)).toEqual([{ assetId: 'a', amount: '1', updatedAt: 5 }])
    expect(cleanHoldings({})).toEqual([])
    const many = Array.from({ length: 60 }, (_, i) => ({ assetId: `t${i}`, amount: '1' }))
    expect(cleanHoldings(many)).toHaveLength(HOLDINGS_LIMIT)
  })
})

describe('value per issuer', () => {
  it('xStocks: amount x price per share', () => {
    const s = summarize([{ assetId: 'n', amount: '10' }], { n: asset() }, { now: NOW })
    expect(usd(s.value)).toBe('$1,812.40')
  })

  it('Ondo: amount of tokens x price per token, for a token that tracks ten shares', () => {
    const s = summarize([{ assetId: 'o', amount: '2' }], { o: ondo() }, { now: NOW })
    expect(usd(s.value)).toBe('$1,410.00')
    expect(usd(dollarGap('2', ondo(), NOW).units)).toBe('$10.00')
  })

  it('keeps every digit of an 18-decimal amount', () => {
    const s = summarize([{ assetId: 'n', amount: '0.123456789012345678' }], { n: asset({ tokenPrice: 1 }) }, { now: NOW })
    expect(s.value).toBe(123456789012345678n)
  })

  it('sorts by estimated value, largest first, never by gap', () => {
    const byId = {
      small: asset({ id: 'small', tokenPrice: 1, stockPrice: 0.5 }),
      big: asset({ id: 'big', tokenPrice: 100 }),
      none: asset({ id: 'none', tokenPrice: null }),
    }
    const s = summarize(
      [{ assetId: 'none', amount: '1' }, { assetId: 'small', amount: '1' }, { assetId: 'big', amount: '1' }],
      byId,
      { now: NOW },
    )
    expect(s.rows.map((r) => r.assetId)).toEqual(['big', 'small', 'none'])
  })

  it('skips a token that left the universe', () => {
    expect(summarize([{ assetId: 'gone', amount: '1' }], {}, { now: NOW }).total).toBe(0)
  })
})

describe('price move and what is left out', () => {
  it('prior = value / (1 + change / 100); move = value - prior; percent of the total prior', () => {
    // 10 x 181.24 = 1812.40, at +0.5%: prior 1803.38, move 9.02
    const s = summarize([{ assetId: 'n', amount: '10' }], { n: asset() }, { now: NOW })
    expect(formatMove(s.move, s.movePct)).toBe('+$9.02 (+0.50%)')
  })

  it('leaves out a token with no price and one whose price is older than a day (criterion 5)', () => {
    const byId = {
      live: asset({ id: 'live' }),
      none: asset({ id: 'none', tokenPrice: null }),
      old: asset({ id: 'old', priceUpdatedAt: NOW - 25 * 3600_000 }),
    }
    const s = summarize(
      ['live', 'none', 'old'].map((assetId) => ({ assetId, amount: '10' })),
      byId,
      { now: NOW },
    )
    expect(usd(s.value)).toBe('$1,812.40')
    expect(formatMove(s.move, s.movePct)).toBe('+$9.02 (+0.50%)')
    expect(coverageLines(s)).toEqual(['Covers 1 of 3 holdings. 2 have no current price.'])
    expect(s.pricesAt).toBe(FRESH)
  })

  it('says one has no current price in the singular', () => {
    const s = summarize(
      [{ assetId: 'a', amount: '1' }, { assetId: 'b', amount: '1' }],
      { a: asset(), b: asset({ tokenPrice: null }) },
      { now: NOW },
    )
    expect(coverageLines(s)).toEqual(['Covers 1 of 2 holdings. 1 has no current price.'])
  })

  it('names a price move that covers fewer tokens than the value', () => {
    const byId = { a: asset(), b: asset({ dayChange: null }), c: asset({ dayChange: 60 }) }
    const s = summarize(['a', 'b', 'c'].map((assetId) => ({ assetId, amount: '1' })), byId, { now: NOW })
    expect(s.counted).toBe(3)
    expect(coverageLines(s)).toEqual(['Price move covers 1 of 3 holdings.'])
  })

  it('uses the oldest price time among counted tokens', () => {
    const s = summarize(
      [{ assetId: 'a', amount: '1' }, { assetId: 'b', amount: '1' }],
      { a: asset({ priceUpdatedAt: NOW - 1000 }), b: asset({ priceUpdatedAt: NOW - 90_000 }) },
      { now: NOW },
    )
    expect(s.pricesAt).toBe(NOW - 90_000)
  })

  it('shows a placeholder, not "no current price", while the first prices are coming', () => {
    const s = summarize([{ assetId: 'a', amount: '1' }], { a: asset({ tokenPrice: null }) }, { now: NOW, settled: false })
    expect(s.loading).toBe(true)
    expect(s.missing).toBe(0)
  })
})

describe('formatting', () => {
  it('writes dollars to the cent with a true minus', () => {
    expect(formatUsd(units('1234567.891'))).toBe('$1,234,567.89')
    expect(formatUsd(units('-3.2'))).toBe('−$3.20')
    expect(formatUsd(units('0.004'))).toBe('$0.00')
    expect(formatUsd(units('12.1'), { sign: true })).toBe('+$12.10')
    expect(formatMove(units('-12.1'), -0.67)).toBe('−$12.10 (−0.67%)')
  })

  it('writes amounts with grouping and every decimal', () => {
    expect(formatAmount('1250.5')).toBe('1,250.5')
    expect(formatAmount('0.123456789012345678')).toBe('0.123456789012345678')
  })

  it('reads prices by their shortest decimal form', () => {
    expect(toUnits(181.24)).toBe(181_240000000000000000n)
    expect(toUnits(1e-7)).toBe(100000000000n)
    expect(toUnits(1e21)).toBe(10n ** 39n)
    expect(toUnits(NaN)).toBeNull()
  })
})

describe('the dollar gap sentence (criterion 8)', () => {
  it('market open, more and less', () => {
    expect(dollarGapSentence('10', asset(), { now: NOW, closed: null })).toBe(
      'At the latest prices, these tokens are valued about $4.10 more than the shares they track.',
    )
    expect(dollarGapSentence('10', asset({ tokenPrice: 180.42 }), { now: NOW, closed: null })).toBe(
      'At the latest prices, these tokens are valued about $4.10 less than the shares they track.',
    )
  })

  it("market closed names the close from closedGapLabel", () => {
    const closed = { tag: 'Market closed', vs: 'vs Friday’s close', close: 'Friday’s close' }
    expect(dollarGapSentence('10', asset(), { now: NOW, closed })).toBe(
      'At the latest token price, these tokens are valued about $4.10 more than the shares they track at Friday’s close.',
    )
  })

  it('inside the parity band, or when it rounds to $0.00, says about the same', () => {
    const same = 'At the latest prices, these tokens are valued about the same as the shares they track.'
    expect(dollarGapSentence('10', asset({ tokenPrice: 180.85 }), { now: NOW, closed: null })).toBe(same)
    expect(dollarGapSentence('0.001', asset(), { now: NOW, closed: null })).toBe(same)
  })

  it('says nothing unless the gap is confirmed', () => {
    expect(dollarGapSentence('10', asset({ sharesPerToken: null }), { now: NOW })).toBeNull()
    expect(dollarGapSentence('10', asset({ underlying: null }), { now: NOW })).toBeNull()
    expect(dollarGapSentence('10', asset({ priceUpdatedAt: NOW - 25 * 3600_000 }), { now: NOW })).toBeNull()
  })

  it('uses shares per token for Ondo', () => {
    expect(dollarGapSentence('2', ondo(), { now: NOW, closed: null })).toBe(
      'At the latest prices, these tokens are valued about $10.00 more than the shares they track.',
    )
  })
})

describe('first sign-in merge', () => {
  it("keeps the account's amount, adds the rest, and keeps what does not fit", () => {
    const account = [{ assetId: 'a', amount: '1' }]
    const guest = [{ assetId: 'a', amount: '9' }, { assetId: 'b', amount: '2' }]
    expect(mergeGuest(account, guest)).toEqual({
      merged: [{ assetId: 'a', amount: '1' }, { assetId: 'b', amount: '2' }],
      skipped: 1,
      left: [],
    })
    const full = Array.from({ length: HOLDINGS_LIMIT }, (_, i) => ({ assetId: `t${i}`, amount: '1' }))
    expect(mergeGuest(full, [{ assetId: 'z', amount: '1' }]).left).toEqual([{ assetId: 'z', amount: '1' }])
  })

  it('words the question and the notice exactly', () => {
    expect(importQuestion(3)).toBe(
      "Add the 3 holdings on this device to your account? They'll sync to your other devices. You can remove them at any time.",
    )
    expect(skippedNotice(0)).toBeNull()
    expect(skippedNotice(1)).toBe("1 holding was already in your account, so we kept the account's amount.")
    expect(skippedNotice(2)).toBe("2 holdings were already in your account, so we kept the account's amounts.")
    expect(alreadyHeld('NVDAx')).toBe('NVDAx is already in your Holdings. Change its amount instead.')
  })
})
