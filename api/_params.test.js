import { describe, it, expect, vi } from 'vitest'
import { rejectUnknownParams } from './_params.js'

/*
 * The drain attack this gate closes: every unknown query key mints a fresh
 * edge-cache key, so ?x=1, ?x=2, … converts one shared cached response into
 * unlimited upstream Finnhub calls. Unknown keys must 400 BEFORE upstream.
 */
function mockRes() {
  const res = { statusCode: null, body: null }
  res.status = vi.fn((code) => {
    res.statusCode = code
    return res
  })
  res.json = vi.fn((body) => {
    res.body = body
    return res
  })
  return res
}

const FINNHUB_ALLOWED = new Set(['kind', 'symbol', 'c'])

describe('rejectUnknownParams', () => {
  it('passes known params through untouched', () => {
    const res = mockRes()
    expect(rejectUnknownParams({ query: { kind: 'quote', symbol: 'AAPL' } }, res, FINNHUB_ALLOWED)).toBe(false)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('rejects any unknown param with 400', () => {
    const res = mockRes()
    expect(
      rejectUnknownParams({ query: { kind: 'quote', symbol: 'AAPL', x: '1' } }, res, FINNHUB_ALLOWED),
    ).toBe(true)
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'bad request' })
  })

  it('accepts the cache-lane marker only with its exact value', () => {
    const ok = mockRes()
    expect(
      rejectUnknownParams({ query: { kind: 'quote', symbol: 'AAPL', c: 'app' } }, ok, FINNHUB_ALLOWED),
    ).toBe(false)
    const bad = mockRes()
    expect(
      rejectUnknownParams({ query: { kind: 'quote', symbol: 'AAPL', c: 'bust1' } }, bad, FINNHUB_ALLOWED),
    ).toBe(true)
    expect(bad.statusCode).toBe(400)
  })

  it('handles empty or missing query safely', () => {
    const res = mockRes()
    expect(rejectUnknownParams({ query: {} }, res, FINNHUB_ALLOWED)).toBe(false)
    expect(rejectUnknownParams({}, res, FINNHUB_ALLOWED)).toBe(false)
    expect(res.status).not.toHaveBeenCalled()
  })
})
