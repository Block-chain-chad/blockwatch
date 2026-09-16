import { describe, it, expect } from 'vitest'
import {
  DEFAULT_MULTIPLIER,
  RATIO_RISE_CEILING,
  MAX_PROVEN_RISE,
  RATIO_DROP_FLOOR,
  reconcileRatio,
  ratioFor,
  toRational,
  effectiveMultiplier,
  pendingMultiplier,
  isUnity,
  rawToUi,
  uiToRaw,
  perShare,
  candlesPerShare,
  multiplierLine,
} from './multiplier'
import { VERIFIED_MINTS } from '../data/verifiedMints'

/*
 * These conversions decide how many tokens a sell transaction carries. A user
 * reads their balance off Phantom, which is UI units; the chain is sized in
 * raw. Getting the direction wrong oversells by the multiplier — ten times
 * over on NFLXx — so every direction and every refusal gets a test.
 *
 * The real ratios, read off Solana mainnet on 2026-09-16:
 *   NFLXx  10                   (a 10-for-1 split)
 *   CRWDx  4
 *   TQQQx  2.008976295242212
 *   AZNx   0.5111362527152737   (the only one below 1.0)
 *   TSLAx  1                    (no change on screen)
 */
const NFLX = { multiplier: '1', nextMultiplier: '10', nextMultiplierAt: '2025-11-16T23:55:00.000Z' }
const TQQQ = {
  multiplier: '2.0057467223799277',
  nextMultiplier: '2.008976295242212',
  nextMultiplierAt: '2026-06-24T00:30:00.000Z',
}
const AZN = {
  multiplier: '0.5111362527152737',
  nextMultiplier: '0.5111362527152737',
  nextMultiplierAt: '2026-08-07T00:30:00.000Z',
}
const TSLA = { multiplier: '1' }
const NOW = Date.parse('2026-09-16T20:00:00.000Z')

describe('toRational — the multiplier as an exact fraction, never a float', () => {
  it('reads a whole number', () => {
    expect(toRational('10')).toEqual({ num: 10n, den: 1n })
  })

  it('reads a long decimal without losing a digit', () => {
    expect(toRational('0.5111362527152737')).toEqual({
      num: 5111362527152737n,
      den: 10n ** 16n,
    })
  })

  it('refuses anything it cannot read exactly, rather than defaulting to 1', () => {
    for (const bad of ['', ' ', 'abc', '1e10', '-1', '0', '1.', '.5', null, undefined, NaN, {}]) {
      expect(toRational(bad)).toBeNull()
    }
  })
})

describe('effectiveMultiplier — Token-2022 switches the moment the timestamp passes', () => {
  it('uses the scheduled value once its effective time has passed', () => {
    // The trap: NFLXx still reports multiplier "1". Reading that field alone
    // says one token is one share, when the split made it ten.
    expect(effectiveMultiplier(NFLX, NOW)).toBe('10')
  })

  it('uses the standing value while the change is still in the future', () => {
    const before = Date.parse('2025-11-16T00:00:00.000Z')
    expect(effectiveMultiplier(NFLX, before)).toBe('1')
  })

  it('switches exactly at the effective timestamp, not after it', () => {
    const at = Date.parse('2025-11-16T23:55:00.000Z')
    expect(effectiveMultiplier(NFLX, at)).toBe('10')
    expect(effectiveMultiplier(NFLX, at - 1)).toBe('1')
  })

  it('takes the newer of two real ratios when both are past', () => {
    // TQQQx ratcheted 2.0057 -> 2.0090. Reading the standing field would
    // quote a ratio the issuer already replaced.
    expect(effectiveMultiplier(TQQQ, NOW)).toBe('2.008976295242212')
  })

  it('defaults to 1 for an asset with no pin at all (Ondo, bStocks)', () => {
    expect(effectiveMultiplier(null, NOW)).toBe(DEFAULT_MULTIPLIER)
    expect(effectiveMultiplier(undefined, NOW)).toBe('1')
  })
})

describe('pendingMultiplier — a scheduled change that has not landed yet', () => {
  it('reports one that is still in the future', () => {
    const soon = { multiplier: '1', nextMultiplier: '1.02', nextMultiplierAt: '2026-10-01T00:30:00.000Z' }
    expect(pendingMultiplier(soon, NOW)).toEqual({
      multiplier: '1.02',
      at: '2026-10-01T00:30:00.000Z',
    })
  })

  it('reports nothing once it has taken effect', () => {
    expect(pendingMultiplier(NFLX, NOW)).toBeNull()
  })

  it('reports nothing when the scheduled value is the standing one', () => {
    expect(pendingMultiplier(AZN, NOW)).toBeNull()
  })

  it('reports nothing for an asset with no ratio at all', () => {
    expect(pendingMultiplier(TSLA, NOW)).toBeNull()
    expect(pendingMultiplier(null, NOW)).toBeNull()
  })
})

describe('isUnity', () => {
  it('is true for the forms of one', () => {
    expect(isUnity('1')).toBe(true)
    expect(isUnity('1.000')).toBe(true)
  })

  it('is false for a real ratio and for nonsense', () => {
    expect(isUnity('10')).toBe(false)
    expect(isUnity('1.0000001')).toBe(false)
    expect(isUnity('nope')).toBe(false)
  })
})

describe('rawToUi — what the wallet will show', () => {
  it('scales a split ratio: 0.129 base NFLXx is 1.29 in Phantom', () => {
    // Measured live 2026-09-16: $100 of NFLXx quoted 12905000 raw units.
    expect(rawToUi('12905000', '10')).toBe('129050000')
  })

  it('scales a fractional ratio down', () => {
    expect(rawToUi('100000000', '0.5111362527152737')).toBe('51113625')
  })

  it('leaves a 1.0 asset untouched', () => {
    expect(rawToUi('366720000', '1')).toBe('366720000')
  })

  it('truncates, so a displayed amount is never more than the chain delivers', () => {
    expect(rawToUi('3', '0.5')).toBe('1')
  })

  it('returns null rather than a number in the wrong unit', () => {
    expect(rawToUi('100', 'bad')).toBeNull()
    expect(rawToUi('1.5', '10')).toBeNull()
    expect(rawToUi(null, '10')).toBeNull()
  })
})

describe('uiToRaw — sizing a sell in the unit the user actually read', () => {
  it('a typed 1 NFLXx is a tenth of a base token, not a whole one', () => {
    // The bug this kills: sending 100000000 raw would have sold ten NFLXx
    // as Phantom counts them, when the user asked to sell one.
    expect(uiToRaw('100000000', '10')).toBe('10000000')
  })

  it('a typed 1 AZNx is nearly two base tokens', () => {
    expect(uiToRaw('100000000', '0.5111362527152737')).toBe('195642550')
  })

  it('handles the TQQQx ratio', () => {
    expect(uiToRaw('100000000', '2.008976295242212')).toBe('49776595')
  })

  it('leaves a 1.0 asset untouched, so nothing changes for 37 of the 103', () => {
    expect(uiToRaw('366720000', '1')).toBe('366720000')
  })

  it('round-trips back inside one raw unit', () => {
    const raw = uiToRaw('100000000', '2.008976295242212')
    const back = Number(rawToUi(raw, '2.008976295242212'))
    expect(Math.abs(back - 100000000)).toBeLessThanOrEqual(2)
  })

  it('truncates, so it sells marginally less than asked and never more', () => {
    expect(uiToRaw('3', '2')).toBe('1')
  })

  it('refuses an unreadable multiplier instead of falling back to 1', () => {
    // Falling back to 1 here is exactly the ten-times-oversell bug.
    expect(uiToRaw('100000000', 'bad')).toBeNull()
    expect(uiToRaw('100000000', '0')).toBeNull()
    expect(uiToRaw('100000000', undefined)).toBeNull()
  })
})

describe('perShare — a pool price per base token becomes a price per share', () => {
  it('divides a split-ratio pool price down to the share price', () => {
    // Measured live 2026-09-16: the NFLXx pool priced one base token at
    // ~757 USD while NFLX itself traded at 76.41.
    expect(perShare(757.45, '10')).toBeCloseTo(75.745, 3)
  })

  it('divides a fractional ratio up', () => {
    expect(perShare(84.51, '0.5111362527152737')).toBeCloseTo(165.33, 1)
  })

  it('leaves a 1.0 asset untouched', () => {
    expect(perShare(218.49, '1')).toBe(218.49)
  })

  it('returns null for an unusable price or ratio', () => {
    expect(perShare(NaN, '10')).toBeNull()
    expect(perShare(100, 'bad')).toBeNull()
  })
})

describe('candlesPerShare — pool candles become comparable to the share', () => {
  // Shaped like services/candles.js output. The NFLXx numbers are the real
  // pool level measured on 2026-09-16, when NFLX itself traded at 76.41.
  const pool = [
    { time: 1_757_000_000, open: 757.45, high: 762.1, low: 751.0, close: 760.0, volume: 12345 },
    { time: 1_757_000_300, open: 760.0, high: 764.0, low: 758.5, close: 761.2, volume: 999 },
  ]

  it('divides a 10x ratio down to share level', () => {
    const out = candlesPerShare(pool, '10')
    expect(out[0].open).toBeCloseTo(75.745, 4)
    expect(out[0].high).toBeCloseTo(76.21, 4)
    expect(out[0].low).toBeCloseTo(75.1, 4)
    expect(out[0].close).toBeCloseTo(76.0, 4)
    expect(out[1].close).toBeCloseTo(76.12, 4)
  })

  it('leaves volume alone, because it is already dollars', () => {
    expect(candlesPerShare(pool, '10')[0].volume).toBe(12345)
    expect(candlesPerShare(pool, '10')[1].volume).toBe(999)
  })

  it('returns the very same array for a 1.0 asset, so nothing is copied for 37 of 103', () => {
    expect(candlesPerShare(pool, '1')).toBe(pool)
  })

  it('scales a fractional ratio upward', () => {
    expect(candlesPerShare([{ time: 1, open: 84.51, high: 84.51, low: 84.51, close: 84.51, volume: 1 }], '0.5111362527152737')[0].close).toBeCloseTo(
      165.33,
      1
    )
  })

  it('draws nothing rather than a chart in the wrong unit', () => {
    expect(candlesPerShare(pool, 'bad')).toBeNull()
    expect(candlesPerShare(pool, '0')).toBeNull()
    expect(candlesPerShare(null, '10')).toBeNull()
  })

  it('keeps the candle shape intact', () => {
    expect(Object.keys(candlesPerShare(pool, '2')[0]).sort()).toEqual(
      ['close', 'high', 'low', 'open', 'time', 'volume'].sort()
    )
    expect(candlesPerShare(pool, '2')[0].time).toBe(1_757_000_000)
  })
})

describe('multiplierLine — what the issuer says a token tracks', () => {
  it('says nothing at all when one token tracks one share', () => {
    expect(multiplierLine(TSLA, { underlying: 'TSLA', now: NOW })).toBeNull()
    expect(multiplierLine(null, { underlying: 'TSLA', now: NOW })).toBeNull()
  })

  it('states the ratio against the underlying and dates the issuer change', () => {
    expect(multiplierLine(NFLX, { underlying: 'NFLX', now: NOW })).toBe(
      'Issuer ratio: 1 token tracks the value of 10 NFLX shares. ' +
        'Backed last changed this ratio on 16 Nov 2025.'
    )
  })

  it('names no corporate action, because we do not have one', () => {
    // The old version inferred a cause from the number's shape and was already
    // wrong on this repo's own data: TQQQx at 2.008976 rendered "a dividend",
    // while the issuer documents a 4-for-1 SPLIT moving a ratio from 1.008 to
    // 4.032 — fractional. Sub-one ratios have several causes too.
    for (const pinned of [NFLX, TQQQ, AZN]) {
      const line = multiplierLine(pinned, { underlying: 'X', now: NOW })
      expect(line).not.toMatch(/split|dividend|reverse/i)
    }
  })

  it('does not claim a token IS shares, only that it tracks their value', () => {
    const line = multiplierLine(NFLX, { underlying: 'NFLX', now: NOW })
    expect(line).toContain('tracks the value of')
    expect(line).not.toContain('1 token = ')
  })

  it('uses the same sentence for a ratio below one', () => {
    expect(multiplierLine(AZN, { underlying: 'AZN', now: NOW })).toBe(
      'Issuer ratio: 1 token tracks the value of 0.5111 AZN shares. ' +
        'Backed last changed this ratio on 7 Aug 2026.'
    )
  })

  it('FLOORS to four places rather than rounding up', () => {
    const ko = {
      multiplier: '1.0183317967386898',
      nextMultiplier: '1.0225601246249238',
      nextMultiplierAt: '2026-09-15T00:30:00.000Z',
    }
    // toFixed(4) gives 1.0226, which overstates what the token tracks.
    expect(multiplierLine(ko, { underlying: 'KO', now: NOW })).toContain('1.0225 KO shares')
    expect(multiplierLine(ko, { underlying: 'KO', now: NOW })).not.toContain('1.0226')
  })

  it('shows more places rather than flooring a real ratio to a parity claim', () => {
    const barely = { multiplier: '1.000002' }
    expect(multiplierLine(barely, { underlying: 'X', now: NOW })).toContain(
      'tracks the value of 1.000002 X shares'
    )
  })

  it('omits the date sentence while a change is still pending', () => {
    const soon = { multiplier: '2', nextMultiplier: '4', nextMultiplierAt: '2026-10-01T00:30:00.000Z' }
    expect(multiplierLine(soon, { underlying: 'X', now: NOW })).toBe(
      'Issuer ratio: 1 token tracks the value of 2 X shares.'
    )
  })

  it('still reads sensibly with no underlying ticker to hand', () => {
    expect(multiplierLine(NFLX, { now: NOW })).toContain('tracks the value of 10 shares')
  })
})

describe('the pinned ratios are real and fresh', () => {
  it('pins a ratio for every verified mint', () => {
    const entries = Object.values(VERIFIED_MINTS)
    expect(entries.length).toBeGreaterThan(0)
    for (const m of entries) {
      expect(toRational(effectiveMultiplier(m, NOW)), `${m.ticker} has an unreadable ratio`).not.toBeNull()
    }
  })

  it('still carries the ratios that are not 1.0, so a regeneration cannot quietly flatten them', () => {
    const scaled = Object.values(VERIFIED_MINTS).filter((m) => !isUnity(effectiveMultiplier(m)))
    // 66 of 103 on 2026-09-16. If a future run drops this to zero, either the
    // issuer reset every ratio or the script stopped reading the extension.
    expect(scaled.length).toBeGreaterThan(20)
  })

  // The pin's AGE is deliberately not asserted here. It used to be, and it
  // turned the whole unit suite red on a date nobody had written down while
  // reporting a routine re-pin as a broken test. It lives in
  // scripts/check-pin-age.mjs, run by `npm run check:pin` as the "Pin
  // freshness" step in ci.yml and again in repin-mints.yml, with its rule
  // tested in scripts/check-pin-age.test.js.
})

/*
 * reconcileRatio — which ratio sizes a trade.
 *
 * The pin is issuer-verified but frozen at the moment verify-mints ran, and
 * the issuer schedules changes continuously. Measured live on 2026-09-16: the
 * pin for CRMx was taken at 20:17 UTC carrying 1.0054716788543585 with nothing
 * pending, and by 20:47 the chain held a new value of 1.0067077500492987
 * effective 00:30 the next morning. Sizing a sell on the pin after that moment
 * sells 0.1229% more than typed, and for accruing mints a stale ratio always
 * errs toward overselling.
 */
describe('reconcileRatio — pin versus live', () => {
  const CRM_PIN = {
    multiplier: '1.0036630653273484',
    nextMultiplier: '1.0054716788543585',
    nextMultiplierAt: '2026-06-11T00:30:00.000Z',
  }
  const CRM_LIVE = {
    multiplier: '1.0054716788543585',
    nextMultiplier: '1.0067077500492987',
    nextMultiplierAt: '2026-09-17T00:30:00.000Z',
  }
  const AFTER = Date.parse('2026-09-17T01:00:00.000Z')
  const PINNED_AT = '2026-09-16T20:17:19.852Z'

  it('falls back to the pin when the live read is unavailable', () => {
    expect(reconcileRatio(CRM_PIN, null, { now: NOW })).toBe('1.0054716788543585')
  })

  it('prefers the live value once a scheduled change the pin never saw takes effect', () => {
    // This is the whole point: at 01:00 the pin still says 1.00547 and the
    // chain says 1.00671.
    expect(effectiveMultiplier(CRM_PIN, AFTER)).toBe('1.0054716788543585')
    expect(reconcileRatio(CRM_PIN, CRM_LIVE, { now: AFTER, verifiedAt: PINNED_AT })).toBe('1.0067077500492987')
  })

  it('agrees with the pin before that change takes effect', () => {
    expect(reconcileRatio(CRM_PIN, CRM_LIVE, { now: NOW, verifiedAt: PINNED_AT })).toBe('1.0054716788543585')
  })

  it('refuses a large jump it cannot tie back to the pin', () => {
    // A split the pin has not seen, or a feed saying something the issuer did
    // not. Either way the ratio is unknown, and an unknown ratio must stop a
    // sell rather than size it tenfold.
    expect(reconcileRatio({ multiplier: '1' }, { multiplier: '10' }, { now: NOW, verifiedAt: PINNED_AT })).toBeNull()
    expect(reconcileRatio({ multiplier: '10' }, { multiplier: '1' }, { now: NOW, verifiedAt: PINNED_AT })).toBeNull()
  })

  it('accepts an upward accrual-sized difference without asking for provenance', () => {
    // OPENx's real history has a single accrual step of 2.0816%, so a band
    // tighter than that would refuse a legitimate dividend.
    expect(reconcileRatio({ multiplier: '1' }, { multiplier: '1.0208' }, { now: NOW })).toBe('1.0208')
    expect(reconcileRatio({ multiplier: '1' }, { multiplier: '1.05' }, { now: NOW })).toBe('1.05')
    // Past the band, and with nothing tying it to the pin.
    expect(reconcileRatio({ multiplier: '1' }, { multiplier: '1.06' }, { now: NOW })).toBeNull()
    expect(RATIO_RISE_CEILING).toBe('1.05')
  })

  it('refuses an unreadable value from either side', () => {
    expect(reconcileRatio({ multiplier: 'bad' }, { multiplier: '1' }, { now: NOW })).toBeNull()
    expect(reconcileRatio({ multiplier: '1' }, { multiplier: 'bad' }, { now: NOW })).toBeNull()
    expect(reconcileRatio({ multiplier: 'bad' }, null, { now: NOW })).toBeNull()
  })

  it('leaves an asset with no mint at 1, since the issuer never scaled it', () => {
    expect(reconcileRatio(null, null, { now: NOW })).toBe('1')
    expect(reconcileRatio(null, { multiplier: '10' }, { now: NOW })).toBe('1')
  })

  it('REFUSES an unpinned Solana mint, the same as everywhere else', () => {
    // F4 removed the assume-1.0 habit from the candle and spread paths; this
    // was the last place it survived, guarded only by the sheet happening to
    // check verifiedToken first.
    const mint = 'UnverifiedMintAddress11111111111111111111111'
    expect(reconcileRatio(null, null, { mint, now: NOW })).toBeNull()
    expect(reconcileRatio(null, { multiplier: '10' }, { mint, now: NOW })).toBeNull()
  })

  it('refuses a live payload that is truthy but says nothing readable', () => {
    // effectiveMultiplier defaults a shapeless object to 1.0, and against a
    // pin near 1.0 that lands inside the drift band — sizing a real sell on a
    // ratio nobody ever reported. Read explicitly instead.
    const pin = { multiplier: '1.0004' }
    for (const live of [{}, [], true, '10', 42]) {
      expect(reconcileRatio(pin, live, { now: NOW }), `accepted ${JSON.stringify(live)}`).toBeNull()
    }
  })
})

/*
 * ratioFor — the difference between "1.0 by design" and "we have not checked".
 *
 * All 103 Solana mints are pinned today, so the refusal below cannot fire in
 * production right now. It fires the moment a universe rebuild adds a mint
 * before verify-mints runs again, or verification rejects one — and at that
 * moment a silent 1.0 draws a ratio-10 mint's candles at 757 under a $76
 * share.
 */
describe('ratioFor', () => {
  it('uses the pin when there is one', () => {
    expect(ratioFor(NFLX, 'XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL', NOW)).toBe('10')
  })

  it('is 1.0 for an asset with no mint at all, which is Ondo and bStocks', () => {
    expect(ratioFor(null, null, NOW)).toBe('1')
    expect(ratioFor(null, undefined, NOW)).toBe('1')
  })

  it('REFUSES for a Solana mint that carries no pin', () => {
    // Not the same silence: this is a token we simply have not verified.
    expect(ratioFor(null, 'SomeUnverifiedMintAddress1111111111111111111', NOW)).toBeNull()
  })
})

/*
 * A split the pin has not seen.
 *
 * This is the case the live read exists for, and the first version of the
 * drift rule refused it — a split is a large jump BY DEFINITION, so refusing
 * every large jump refused exactly the event most worth catching, and took
 * that name's sell path offline until someone re-pinned it by hand. The pinned
 * history is full of them: NFLXx and PPLTx 1 to 10, PALLx 1 to 5, CRWDx 1 to 4.
 *
 * Token-2022 rolls the previously effective value into `multiplier` before
 * writing a new schedule, so a genuine post-pin update carries a standing
 * value the pin already knew plus a schedule dated after verification ran.
 * That is provable, and nothing else is accepted.
 */
describe('reconcileRatio accepts a provable post-pin split', () => {
  const PINNED_AT = '2026-09-16T20:17:19.852Z'
  const AFTER_SPLIT = Date.parse('2026-09-18T12:00:00.000Z')
  // The hatch is opt-in now. Every test in here is about the hatch, so they
  // all ask for it; the buy-side cases that must NOT get it are below.
  const withHatch = { now: AFTER_SPLIT, verifiedAt: PINNED_AT, allowProvenUpdate: true }

  it('takes a 10x jump when the live config proves it followed the pin', () => {
    const pin = { multiplier: '1' }
    const live = {
      multiplier: '1', // the value the pin recorded — rolled forward by the chain
      nextMultiplier: '10',
      nextMultiplierAt: '2026-09-17T23:55:00.000Z', // after the pin was taken
    }
    expect(reconcileRatio(pin, live, withHatch)).toBe('10')
  })

  it('accepts when the live standing value matches the pin\'s SCHEDULED value', () => {
    // The ordinary shape once a pinned schedule has fired: CRMx exactly.
    const pin = { multiplier: '1', nextMultiplier: '2', nextMultiplierAt: '2026-09-01T00:00:00.000Z' }
    const live = { multiplier: '2', nextMultiplier: '20', nextMultiplierAt: '2026-09-17T00:00:00.000Z' }
    expect(reconcileRatio(pin, live, withHatch)).toBe('20')
  })

  it('compares as fractions, so "1" and "1.0000" are the same starting point', () => {
    const pin = { multiplier: '1' }
    const live = { multiplier: '1.0000', nextMultiplier: '10', nextMultiplierAt: '2026-09-17T23:55:00.000Z' }
    expect(reconcileRatio(pin, live, withHatch)).toBe('10')
  })

  it('refuses when the value it moved FROM is not one the pin ever recorded', () => {
    // An old-old value: this config is not the pin moved forward.
    const pin = { multiplier: '2', nextMultiplier: '3', nextMultiplierAt: '2026-09-01T00:00:00.000Z' }
    const live = { multiplier: '1', nextMultiplier: '10', nextMultiplierAt: '2026-09-17T23:55:00.000Z' }
    expect(reconcileRatio(pin, live, withHatch)).toBeNull()
  })

  it('refuses a schedule dated BEFORE the pin, which is another mint\'s config', () => {
    const pin = { multiplier: '1' }
    const live = { multiplier: '1', nextMultiplier: '10', nextMultiplierAt: '2026-05-01T00:00:00.000Z' }
    expect(reconcileRatio(pin, live, withHatch)).toBeNull()
  })

  it('refuses a bare large value with no schedule to prove anything', () => {
    expect(
      reconcileRatio({ multiplier: '1' }, { multiplier: '10' }, withHatch)
    ).toBeNull()
  })

  it('refuses when no verifiedAt is supplied, since (c) cannot be checked', () => {
    const pin = { multiplier: '1' }
    const live = { multiplier: '1', nextMultiplier: '10', nextMultiplierAt: '2026-09-17T23:55:00.000Z' }
    expect(reconcileRatio(pin, live, { now: AFTER_SPLIT, allowProvenUpdate: true })).toBeNull()
  })
})

/*
 * The hatch only opens upward.
 *
 * provablyAfterPin checks the SHAPE of a live config, not its value. 48 of the
 * 103 pins have a multiplier of exactly 1, so its first condition is met by
 * any feed reporting the true standing value; a nextMultiplier field and a
 * post-pin date were then the only things between a fabricated ratio and a
 * real sell. Pointed downward that is a multiplier on the amount sold, because
 * raw size is the typed amount DIVIDED by the ratio.
 *
 * Splits and accrual only move a ratio up. Down means a reverse split or
 * something rarer, and that should cost a re-run of verify-mints.
 */
describe('reconcileRatio refuses a provable update that moves the ratio down', () => {
  const PINNED_AT = '2026-09-16T20:57:21.973Z'
  const AFTER = '2026-09-16T20:58:21.973Z' // one minute past the pin
  const NOW_LATER = Date.parse('2026-09-20T12:00:00.000Z')
  const pin = { multiplier: '1' } // TSLAx's real pin
  const opts = { now: NOW_LATER, verifiedAt: PINNED_AT, allowProvenUpdate: true }

  it('refuses the reproduction: a tenth, which would sell ten times the amount typed', () => {
    const live = { multiplier: '1', nextMultiplier: '0.1', nextMultiplierAt: AFTER }
    expect(reconcileRatio(pin, live, opts)).toBeNull()
  })

  it('refuses a ten-thousandfold version of the same trick', () => {
    const live = { multiplier: '1', nextMultiplier: '0.0001', nextMultiplierAt: AFTER }
    expect(reconcileRatio(pin, live, opts)).toBeNull()
  })

  it('still accepts a split, which is what the hatch is for', () => {
    const live = { multiplier: '1', nextMultiplier: '10', nextMultiplierAt: AFTER }
    expect(reconcileRatio(pin, live, opts)).toBe('10')
  })

  it('accepts a live value equal to the pin', () => {
    const live = { multiplier: '1', nextMultiplier: '1', nextMultiplierAt: AFTER }
    expect(reconcileRatio(pin, live, opts)).toBe('1')
  })

  it('refuses any provable drop past the floor', () => {
    // Values near the pin are the drift band's business, not this hatch's;
    // these are well outside it and reach the provenance path.
    for (const down of ['0.9', '0.5', '0.25']) {
      const live = { multiplier: '1', nextMultiplier: down, nextMultiplierAt: AFTER }
      expect(reconcileRatio(pin, live, opts), `accepted ${down}`).toBeNull()
    }
  })

  it('measures the drop against the PIN, not against one', () => {
    const highPin = { multiplier: '4' }
    const halved = { multiplier: '4', nextMultiplier: '2', nextMultiplierAt: AFTER }
    expect(reconcileRatio(highPin, halved, opts)).toBeNull()
  })
})

/*
 * The no-provenance band is asymmetric.
 *
 * Its five percent was bought by OPENx's 2.0816% UPWARD accrual step. Nothing
 * downward ever needed that room, and applied symmetrically it accepted a live
 * 0.951 against a pin of 1 with no provenance at all — which sells 105.15 when
 * 100 is typed, because raw size is the typed amount divided by the ratio.
 */
describe('the drift band is wider upward than downward', () => {
  const pin = { multiplier: '1' }
  const opts = { now: NOW }

  it('accepts a five percent rise with no provenance', () => {
    expect(reconcileRatio(pin, { multiplier: '1.05' }, opts)).toBe('1.05')
  })

  it('refuses the symmetric case that used to pass', () => {
    // 0.951 against a pin of 1: 4.9% down, inside the old symmetric band.
    expect(reconcileRatio(pin, { multiplier: '0.951' }, opts)).toBeNull()
  })

  it('accepts a dip inside the downward floor', () => {
    expect(reconcileRatio(pin, { multiplier: '0.99' }, opts)).toBe('0.99')
    expect(reconcileRatio(pin, { multiplier: '0.98' }, opts)).toBe('0.98')
  })

  it('refuses one just past the downward floor', () => {
    expect(reconcileRatio(pin, { multiplier: '0.979' }, opts)).toBeNull()
  })

  it('names the two bounds', () => {
    expect(RATIO_RISE_CEILING).toBe('1.05')
    expect(RATIO_DROP_FLOOR).toBe('0.98')
  })
})

/*
 * The hatch is opt-in, and capped.
 *
 * provablyAfterPin says a config FOLLOWS the pin. It says nothing about the
 * size of the value, and what an over-large value costs depends entirely on
 * what the number is used for. Sizing an input divides by the ratio, so too
 * high undersells. Stating an output multiplies by it, so too high overstates
 * what the user is about to sign for — and the transaction stays valid, so
 * nothing downstream catches it.
 */
describe('the proven-update hatch is opt-in and bounded', () => {
  const PINNED_AT = '2026-09-16T20:57:21.973Z'
  const AFTER = '2026-09-16T20:58:21.973Z'
  const NOW_LATER = Date.parse('2026-09-20T12:00:00.000Z')
  const pin = { multiplier: '1' }
  const split = { multiplier: '1', nextMultiplier: '10', nextMultiplierAt: AFTER }
  const absurd = { multiplier: '1', nextMultiplier: '1000', nextMultiplierAt: AFTER }
  const base = { now: NOW_LATER, verifiedAt: PINNED_AT }

  it('is closed by default, so a caller has to have thought about it', () => {
    expect(reconcileRatio(pin, split, base)).toBeNull()
  })

  it('opens on request, for a real split', () => {
    expect(reconcileRatio(pin, split, { ...base, allowProvenUpdate: true })).toBe('10')
  })

  it('refuses an absurd value even when opened and even when proven', () => {
    // The V1 reproduction: 1000 against a pin of 1, correctly shaped and
    // correctly dated, was accepted before the cap existed.
    expect(reconcileRatio(pin, absurd, { ...base, allowProvenUpdate: true })).toBeNull()
  })

  it('caps at twenty times the pin, above the largest real split of ten', () => {
    const at20 = { multiplier: '1', nextMultiplier: '20', nextMultiplierAt: AFTER }
    const past20 = { multiplier: '1', nextMultiplier: '20.1', nextMultiplierAt: AFTER }
    expect(reconcileRatio(pin, at20, { ...base, allowProvenUpdate: true })).toBe('20')
    expect(reconcileRatio(pin, past20, { ...base, allowProvenUpdate: true })).toBeNull()
    expect(MAX_PROVEN_RISE).toBe('20')
  })

  it('still serves a ratio inside the band without the hatch, either way', () => {
    // A buy must keep working normally; only the hatch is withheld from it.
    expect(reconcileRatio(pin, { multiplier: '1.03' }, base)).toBe('1.03')
    expect(reconcileRatio(pin, { multiplier: '1.03' }, { ...base, allowProvenUpdate: true })).toBe('1.03')
  })
})
