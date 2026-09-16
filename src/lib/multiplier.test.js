import { describe, it, expect } from 'vitest'
import {
  DEFAULT_MULTIPLIER,
  MAX_PIN_AGE_DAYS,
  MAX_RATIO_DRIFT,
  reconcileRatio,
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
import { VERIFIED_MINTS, VERIFIED_AT } from '../data/verifiedMints'

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

describe('multiplierLine — the one honest sentence on the asset screen', () => {
  it('says nothing at all when one token is one share', () => {
    expect(multiplierLine(TSLA, NOW)).toBeNull()
    expect(multiplierLine(null, NOW)).toBeNull()
  })

  it('calls a whole-number ratio a split and dates it', () => {
    expect(multiplierLine(NFLX, NOW)).toBe('1 token = 10 shares since a split on 16 Nov 2025')
  })

  it('calls a fractional ratio above one a dividend', () => {
    const ko = {
      multiplier: '1.0183317967386898',
      nextMultiplier: '1.0225601246249238',
      nextMultiplierAt: '2026-09-15T00:30:00.000Z',
    }
    expect(multiplierLine(ko, NOW)).toBe('1 token = 1.0226 shares since a dividend on 15 Sep 2026')
  })

  it('handles a ratio below one', () => {
    expect(multiplierLine(AZN, NOW)).toBe('1 token = 0.5111 shares since a split on 7 Aug 2026')
  })

  it('quotes the standing ratio while a change is still pending', () => {
    const soon = { multiplier: '2', nextMultiplier: '4', nextMultiplierAt: '2026-10-01T00:30:00.000Z' }
    expect(multiplierLine(soon, NOW)).toBe('1 token = 2 shares')
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

  it(`fails once the pin is more than ${MAX_PIN_AGE_DAYS} days old`, () => {
    // Dividend ratios move on the issuer's schedule. A pin left to go stale is
    // a wrong ratio sizing a real sell, so this test is the reminder to re-run
    // scripts/verify-mints.mjs rather than a formality.
    const ageDays = (Date.now() - Date.parse(VERIFIED_AT)) / 86_400_000
    expect(ageDays, `verifiedMints.json is ${ageDays.toFixed(1)} days old — re-run scripts/verify-mints.mjs`).toBeLessThan(
      MAX_PIN_AGE_DAYS
    )
  })
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

  it('falls back to the pin when the live read is unavailable', () => {
    expect(reconcileRatio(CRM_PIN, null, NOW)).toBe('1.0054716788543585')
  })

  it('prefers the live value once a scheduled change the pin never saw takes effect', () => {
    // This is the whole point: at 01:00 the pin still says 1.00547 and the
    // chain says 1.00671.
    expect(effectiveMultiplier(CRM_PIN, AFTER)).toBe('1.0054716788543585')
    expect(reconcileRatio(CRM_PIN, CRM_LIVE, AFTER)).toBe('1.0067077500492987')
  })

  it('agrees with the pin before that change takes effect', () => {
    expect(reconcileRatio(CRM_PIN, CRM_LIVE, NOW)).toBe('1.0054716788543585')
  })

  it('refuses when the two disagree by more than accrual ever could', () => {
    // A split the pin has not seen, or a feed saying something the issuer did
    // not. Either way the ratio is unknown, and an unknown ratio must stop a
    // sell rather than size it tenfold.
    expect(reconcileRatio({ multiplier: '1' }, { multiplier: '10' }, NOW)).toBeNull()
    expect(reconcileRatio({ multiplier: '10' }, { multiplier: '1' }, NOW)).toBeNull()
  })

  it('accepts drift right up to the bound and refuses past it', () => {
    expect(reconcileRatio({ multiplier: '1' }, { multiplier: '1.019' }, NOW)).toBe('1.019')
    expect(reconcileRatio({ multiplier: '1' }, { multiplier: '1.021' }, NOW)).toBeNull()
    expect(MAX_RATIO_DRIFT).toBe(0.02)
  })

  it('refuses an unreadable value from either side', () => {
    expect(reconcileRatio({ multiplier: 'bad' }, { multiplier: '1' }, NOW)).toBeNull()
    expect(reconcileRatio({ multiplier: '1' }, { multiplier: 'bad' }, NOW)).toBeNull()
    expect(reconcileRatio({ multiplier: 'bad' }, null, NOW)).toBeNull()
  })

  it('leaves an unpinned asset at 1, since there is nothing to reconcile', () => {
    expect(reconcileRatio(null, null, NOW)).toBe('1')
    expect(reconcileRatio(null, { multiplier: '10' }, NOW)).toBe('1')
  })
})
