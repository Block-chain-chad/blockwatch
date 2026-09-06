import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler from './candles.js'

/*
 * The handler's job is to spend GeckoTerminal's shared ~30/min budget only on
 * requests a real chart needs. So the tests are mostly about what does NOT
 * reach upstream: every malformed or off-allowlist param must 400 before
 * fetch is called, and what does come back must be derived fields only, with
 * the cache policy the timeframe calls for.
 */

function fakeRes() {
  const headers = {}
  const res = {
    statusCode: null,
    body: null,
    headers,
    setHeader: (k, v) => {
      headers[k] = v
    },
    getHeader: (k) => headers[k],
    status(code) {
      res.statusCode = code
      return res
    },
    json(b) {
      res.body = b
      return res
    },
    send(b) {
      res.body = b
      return res
    },
    end() {
      return res
    },
  }
  return res
}

async function call(query, headers = {}) {
  const res = fakeRes()
  await handler({ method: 'GET', query, headers }, res)
  return res
}

const SOL_POOL = 'EHdow7Yhmr1ac8Qff9Co1LhSosr38puA6zLd4cbJLdpV'
const ETH_POOL = '0xff145fd4d52ebd0e758393740aea7eb6228569285b348176c1cdfc5363793b72'
const ohlcvQuery = (over = {}) => ({
  op: 'ohlcv',
  network: 'solana',
  pool: SOL_POOL,
  timeframe: 'minute',
  aggregate: '5',
  limit: '300',
  ...over,
})

const searchBody = {
  data: [
    {
      attributes: { address: SOL_POOL, name: 'AAPLx / USDC', volume_usd: { h24: '1000' }, reserve_in_usd: '5', secret: 'x' },
      relationships: { base_token: { data: { id: 'solana_Xsb' } }, dex: { data: { id: 'byreal' } } },
    },
    {
      attributes: { address: 'other', name: 'GOOGLx / AAPLx', volume_usd: { h24: '9' } },
      relationships: { base_token: { data: { id: 'solana_XsC' } } },
    },
  ],
}
const ohlcvBody = {
  data: { attributes: { ohlcv_list: [[200, 1, 2, 0.5, 1.5, 10], [100, 1, 1, 1, 1, 5]] } },
  meta: { base: { symbol: 'AAPLx', address: 'Xsb' }, quote: { symbol: 'USDC', address: 'EPj' } },
}

let fetchMock
beforeEach(() => {
  fetchMock = vi.fn(async (url) => ({
    ok: true,
    status: 200,
    json: async () => (String(url).includes('/search/') ? searchBody : ohlcvBody),
  }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('api/candles — refuses before upstream', () => {
  const bad = [
    ['unknown param', { op: 'resolve', ticker: 'AAPLx', network: 'solana', x: '1' }],
    ['no op', { ticker: 'AAPLx', network: 'solana' }],
    ['unknown op', { op: 'search', ticker: 'AAPLx', network: 'solana' }],
    ['resolve with a stray ohlcv param', { op: 'resolve', ticker: 'AAPLx', network: 'solana', pool: SOL_POOL }],
    ['ohlcv with a stray ticker', ohlcvQuery({ ticker: 'AAPLx' })],
    ['network off the allowlist', { op: 'resolve', ticker: 'AAPLx', network: 'bsc' }],
    ['ticker with a space', { op: 'resolve', ticker: 'AAPL x', network: 'solana' }],
    ['ticker too long', { op: 'resolve', ticker: 'ABCDEFGHIJK', network: 'solana' }],
    ['repeated ticker param (array)', { op: 'resolve', ticker: ['AAPLx', 'TSLAx'], network: 'solana' }],
    ['path-ish pool', ohlcvQuery({ pool: '../x' })],
    ['eth address on solana', ohlcvQuery({ pool: '0xf5294094bce435bfbd0ec488be5c462aaf32bc7a' })],
    ['solana address on eth', ohlcvQuery({ network: 'eth' })],
    ['aggregate not served', ohlcvQuery({ aggregate: '3' })],
    ['aggregate wrong for bucket', ohlcvQuery({ timeframe: 'day', aggregate: '5' })],
    ['limit off the steps', ohlcvQuery({ limit: '250' })],
    ['unknown bucket', ohlcvQuery({ timeframe: 'week', aggregate: '1' })],
    ['wrong cache-lane value', { op: 'resolve', ticker: 'AAPLx', network: 'solana', c: 'web' }],
    ['prototype key as op', { op: 'constructor', network: 'solana' }],
    ['prototype key as bucket', ohlcvQuery({ timeframe: 'constructor', aggregate: '1' })],
  ]
  for (const [label, query] of bad) {
    it(`400s on ${label}`, async () => {
      const res = await call(query)
      expect(res.statusCode).toBe(400)
      expect(res.body).toEqual({ error: 'bad request' })
      expect(fetchMock).not.toHaveBeenCalled()
    })
  }

  it('answers a preflight without touching upstream', async () => {
    const res = fakeRes()
    await handler({ method: 'OPTIONS', query: {}, headers: { origin: 'https://blockwatch.app' } }, res)
    expect(res.statusCode).toBe(204)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('api/candles — resolve', () => {
  it('returns base-token pools only, busiest first, derived fields only', async () => {
    const res = await call({ op: 'resolve', ticker: 'AAPLx', network: 'solana' })
    expect(res.statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://api.geckoterminal.com/api/v2/search/pools?query=AAPLx&network=solana'
    )
    expect(res.body.candidates.map((c) => c.name)).toEqual(['AAPLx / USDC'])
    expect(res.body.pool.address).toBe(SOL_POOL)
    expect(res.body.pool.secret).toBeUndefined()
    expect(res.headers['Cache-Control']).toBe('s-maxage=86400, stale-while-revalidate=604800')
    expect(res.headers['Content-Type']).toMatch(/json/)
  })

  it('caches a miss for less time than a hit', async () => {
    const res = await call({ op: 'resolve', ticker: 'ZZZZQ', network: 'solana' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ network: 'solana', ticker: 'ZZZZQ', pool: null, candidates: [] })
    expect(res.headers['Cache-Control']).toBe('s-maxage=3600, stale-while-revalidate=86400')
  })

  it('502s when upstream fails, including a rate limit', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
    const res = await call({ op: 'resolve', ticker: 'AAPLx', network: 'solana' })
    expect(res.statusCode).toBe(502)
    expect(res.headers['Cache-Control']).toBeUndefined()
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'))
    expect((await call({ op: 'resolve', ticker: 'AAPLx', network: 'solana' })).statusCode).toBe(502)
  })
})

describe('api/candles — ohlcv', () => {
  it('returns ascending candles with the legs named', async () => {
    const res = await call(ohlcvQuery())
    expect(res.statusCode).toBe(200)
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${SOL_POOL}/ohlcv/minute?aggregate=5&limit=300`
    )
    expect(res.body.candles.map((c) => c.time)).toEqual([100, 200])
    expect(res.body.base.symbol).toBe('AAPLx')
    expect(res.body.aggregate).toBe(5)
  })

  it('caches minute, hour and day series for different lengths', async () => {
    expect((await call(ohlcvQuery())).headers['Cache-Control']).toBe('s-maxage=30, stale-while-revalidate=300')
    expect((await call(ohlcvQuery({ timeframe: 'hour', aggregate: '4' }))).headers['Cache-Control']).toBe(
      's-maxage=300, stale-while-revalidate=3600'
    )
    expect((await call(ohlcvQuery({ timeframe: 'day', aggregate: '1' }))).headers['Cache-Control']).toBe(
      's-maxage=3600, stale-while-revalidate=86400'
    )
  })

  it('accepts both eth pool id widths', async () => {
    expect((await call(ohlcvQuery({ network: 'eth', pool: ETH_POOL }))).statusCode).toBe(200)
    expect(
      (await call(ohlcvQuery({ network: 'eth', pool: '0xf5294094bce435bfbd0ec488be5c462aaf32bc7a' }))).statusCode
    ).toBe(200)
  })

  it('502s rather than caching an empty series', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: {} }) })
    const res = await call(ohlcvQuery())
    expect(res.statusCode).toBe(502)
    expect(res.headers['Cache-Control']).toBeUndefined()
  })

  it('keeps an origin-scoped response out of shared caches', async () => {
    const res = await call(ohlcvQuery(), { origin: 'https://blockwatch.app' })
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://blockwatch.app')
    expect(res.headers['Cache-Control']).toBe('private, max-age=30, stale-while-revalidate=300')
  })

  it('shares the app lane', async () => {
    const res = await call(ohlcvQuery({ c: 'app' }))
    expect(res.headers['Access-Control-Allow-Origin']).toBe('capacitor://localhost')
    expect(res.headers['Cache-Control']).toBe('s-maxage=30, stale-while-revalidate=300')
  })
})
