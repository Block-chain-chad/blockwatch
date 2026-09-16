import { describe, it, expect } from 'vitest'
import {
  legendStatus,
  delayTooltip,
  isStockDelayed,
  STOCK_DELAY_MINUTES,
  LIVE_QUOTE_SECONDS,
  ageWords,
  tokenLegLine,
  shareLegLine,
  shareFreshness,
} from './provenance'

describe('legendStatus', () => {
  it('reads the spec strings for the token leg', () => {
    expect(legendStatus('token', 'regular', 5)).toBe(
      '24/7 · One update every 30 seconds · Raydium by GeckoTerminal'
    )
    // The token trades whatever the market does.
    expect(legendStatus('token', 'closed', 500)).toBe(legendStatus('token', 'regular', 5))
  })

  it('reads the spec string for the stock leg after the close', () => {
    expect(legendStatus('stock', 'closed', 12)).toBe(
      'Market closed · Data is delayed · NASDAQ by Yahoo Finance'
    )
    expect(legendStatus('stock', 'post', 12)).toBe(
      'After hours · Data is delayed · NASDAQ by Yahoo Finance'
    )
    expect(legendStatus('stock', 'pre', 12)).toBe(
      'Pre-market · Data is delayed · NASDAQ by Yahoo Finance'
    )
  })

  it('states the cadence instead of a delay during regular hours with a fresh quote', () => {
    expect(legendStatus('stock', 'regular', 12)).toBe(
      'Market open · One update every 30 seconds · NASDAQ by Yahoo Finance'
    )
    expect(legendStatus('stock', 'regular', 600)).toBe(
      'Market open · Data is delayed · NASDAQ by Yahoo Finance'
    )
  })

  it('names the venue it is given', () => {
    expect(legendStatus('token', 'regular', 1, { venue: 'Orca' })).toContain('Orca by GeckoTerminal')
    expect(legendStatus('stock', 'closed', 1, { venue: 'NYSE' })).toContain('NYSE by Yahoo Finance')
  })

  it('treats an unknown session as closed', () => {
    expect(legendStatus('stock', undefined, 1)).toMatch(/^Market closed/)
  })
})

describe('isStockDelayed', () => {
  it('is delayed outside the regular session whatever the age', () => {
    expect(isStockDelayed('closed', 1)).toBe(true)
    expect(isStockDelayed('pre', 1)).toBe(true)
    expect(isStockDelayed('post', 1)).toBe(true)
  })

  it('is live inside the session within two refreshes, delayed otherwise', () => {
    expect(isStockDelayed('regular', 0)).toBe(false)
    expect(isStockDelayed('regular', 60)).toBe(false)
    expect(isStockDelayed('regular', 61)).toBe(true)
    expect(isStockDelayed('regular', null)).toBe(true)
    expect(isStockDelayed('regular', undefined)).toBe(true)
  })
})

describe('delayTooltip', () => {
  it('reads the spec string with the default delay', () => {
    expect(STOCK_DELAY_MINUTES).toBe(15)
    expect(delayTooltip()).toBe('Quotes are delayed by 15 min')
    expect(delayTooltip(20)).toBe('Quotes are delayed by 20 min')
  })
})

describe('per-leg lines', () => {
  it('words an age', () => {
    expect(ageWords(7)).toBe('7 s ago')
    expect(ageWords(41)).toBe('41 s ago')
    expect(ageWords(125)).toBe('2 m ago')
    expect(ageWords(7200)).toBe('2 h ago')
    expect(ageWords(null)).toBe('no price yet')
  })

  it('reads the token leg', () => {
    expect(tokenLegLine({ price: 218.49, ageSeconds: 7, source: 'Jupiter' })).toBe(
      'Token $218.49 · 7 s ago · via Jupiter'
    )
    expect(tokenLegLine({ price: null, ageSeconds: null, source: 'CoinGecko' })).toBe(
      'Token — · no price yet · via CoinGecko'
    )
  })

  it('reads the share leg from the quote, not from a caller-supplied age', () => {
    const now = Date.parse('2026-08-20T14:00:00Z') // Thu 10:00 ET, regular
    const quote = (secondsAgo, extra) => ({ price: 218.29, basis: 'trade', asOf: now - secondsAgo * 1000, ...extra })

    expect(shareLegLine({ price: 218.29, quote: quote(12), session: 'regular', now, source: 'Finnhub' })).toBe(
      'Share $218.29 · 12 s ago · live · Finnhub'
    )
    expect(shareLegLine({ price: 218.29, quote: quote(900), session: 'regular', now, source: 'Finnhub' })).toBe(
      'Share $218.29 · 15 m ago · delayed · Finnhub'
    )
    // Sat 10:00 ET: the quote is Friday's close, and the line says how old.
    const weekend = Date.parse('2026-08-22T14:00:00Z')
    expect(
      shareLegLine({
        price: 218.29,
        quote: { price: 218.29, basis: 'trade', asOf: weekend - 7200_000 },
        session: 'closed',
        now: weekend,
        source: 'Finnhub',
      })
    ).toBe('Share $218.29 · last close · 2 h ago · Finnhub')
    expect(shareLegLine({ price: null, quote: null, session: 'closed', now, source: 'Finnhub' })).toBe(
      'Share — · no quote yet · Finnhub'
    )
  })
})

describe('shareFreshness', () => {
  // Thu 10:00 ET — a plain weekday in the regular session.
  const OPEN = Date.parse('2026-08-20T14:00:00Z')
  const traded = (asOf) => ({ price: 218.29, basis: 'trade', asOf })

  it('calls a fresh regular-session quote live, and says how fresh', () => {
    const f = shareFreshness({ quote: traded(OPEN - 12_000), session: 'regular', now: OPEN })
    expect(f.state).toBe('live')
    expect(f.ageSeconds).toBe(12)
    expect(f.words).toBe('12 s ago · live')
    expect(f.badge).toBe(null)
  })

  it('never calls a quote older than the live bar live', () => {
    const at = LIVE_QUOTE_SECONDS * 1000
    expect(shareFreshness({ quote: traded(OPEN - at), session: 'regular', now: OPEN }).state).toBe('live')
    const f = shareFreshness({ quote: traded(OPEN - at - 1000), session: 'regular', now: OPEN })
    expect(f.state).toBe('delayed')
    expect(f.words).toBe('1 m ago · delayed')
    expect(f.badge).toEqual({ text: 'Delayed', tone: 'warn' })
  })

  it('refuses to guess the age of an undated quote', () => {
    const f = shareFreshness({ quote: { price: 218.29, basis: 'trade', asOf: null }, session: 'regular', now: OPEN })
    expect(f.state).toBe('undated')
    expect(f.ageSeconds).toBe(null)
    expect(f.words).toBe('age unknown')
    expect(f.badge).toEqual({ text: 'Undated', tone: 'warn' })
  })

  it('says so when the provider only had a previous close', () => {
    const f = shareFreshness({ quote: { price: 218.29, basis: 'prevClose', asOf: null }, session: 'regular', now: OPEN })
    expect(f.state).toBe('close')
    expect(f.words).toBe('previous close')
    expect(f.badge).toEqual({ text: 'Prev close', tone: 'warn' })
    expect(f.title).toContain('not a current price')
  })

  it('names the close, and its age, outside the regular session', () => {
    const post = Date.parse('2026-08-20T21:00:00Z') // Thu 17:00 ET
    const f = shareFreshness({ quote: traded(post - 3_600_000), session: 'post', now: post })
    expect(f.state).toBe('close')
    expect(f.words).toBe('today’s close · 1 h ago')
    expect(f.badge).toEqual({ text: 'Close', tone: 'muted' })
    expect(f.title).toContain('After hours')
  })

  it('names the holiday when the market is shut for one', () => {
    // Thanksgiving 2026, 11:00 ET — a weekday the old code read as normal.
    const holiday = Date.parse('2026-11-26T16:00:00Z')
    const f = shareFreshness({ quote: traded(holiday - 86_400_000), session: 'closed', now: holiday })
    expect(f.state).toBe('close')
    expect(f.words).toBe('last close · 24 h ago')
    expect(f.title).toContain('Thanksgiving Day')
  })

  it('has nothing to say about a missing quote except that it is missing', () => {
    const f = shareFreshness({ quote: null, session: 'regular', now: OPEN })
    expect(f.state).toBe('none')
    expect(f.words).toBe('no quote yet')
    expect(f.badge).toEqual({ text: 'No quote', tone: 'warn' })
  })

  it('puts the quote timestamp in the tooltip, in UTC', () => {
    const f = shareFreshness({ quote: traded(OPEN - 12_000), session: 'regular', now: OPEN })
    expect(f.title).toContain('2026-08-20T13:59:48.000Z')
  })
})
