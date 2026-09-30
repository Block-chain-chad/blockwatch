import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler, { limiters, poolSignature } from './candles.js'

// The pool signing key is derived from this; see poolSignature.
process.env.FINNHUB_API_KEY = 'test-finnhub-key'

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
/** An ohlcv query, signed for its own network and pool unless `sig` is given. */
const ohlcvQuery = (over = {}) => {
  const q = { op: 'ohlcv', network: 'solana', pool: SOL_POOL, timeframe: 'minute', aggregate: '5', limit: '300', ...over }
  return 'sig' in over ? q : { ...q, sig: poolSignature(q.network, q.pool) ?? '' }
}

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
  // Every case starts with full buckets; the rate-limit block below is the
  // only one that cares how many tokens are left.
  limiters.perClient.reset()
  limiters.perInstance.reset()
  fetchMock = vi.fn(async (url) => ({
    ok: true,
    status: 200,
    json: async () => (String(url).includes('/search/') ? searchBody : ohlcvBody),
  }))
  vi.stubGlobal('fetch', fetchMock)
  process.env.FINNHUB_API_KEY = 'test-finnhub-key'
})
afterEach(() => vi.unstubAllGlobals())

describe('api/candles — only pools this proxy handed out', () => {
  const MADE_UP = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'

  it('refuses a well-formed pool with no signature, without calling GeckoTerminal', async () => {
    const res = await call(ohlcvQuery({ pool: MADE_UP, sig: '' }))
    expect(res.statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("refuses another pool's signature, and a signature from the other network", async () => {
    expect((await call(ohlcvQuery({ pool: MADE_UP, sig: poolSignature('solana', SOL_POOL) }))).statusCode).toBe(400)
    const eth = '0xf5294094bce435bfbd0ec488be5c462aaf32bc7a'
    expect((await call(ohlcvQuery({ network: 'eth', pool: eth, sig: poolSignature('solana', eth) }))).statusCode).toBe(400)
    expect((await call(ohlcvQuery({ sig: 'x'.repeat(22) }))).statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('serves a pool exactly as resolve signed it', async () => {
    const resolved = await call({ op: 'resolve', ticker: 'AAPLx', network: 'solana' })
    const { address, sig } = resolved.body.pool
    expect(sig).toMatch(/^[A-Za-z0-9_-]{22}$/)
    const res = await call(ohlcvQuery({ pool: address, sig }))
    expect(res.statusCode).toBe(200)
  })

  it('refuses every pool when the server has no key to sign with', async () => {
    const sig = poolSignature('solana', SOL_POOL)
    delete process.env.FINNHUB_API_KEY
    expect(poolSignature('solana', SOL_POOL)).toBeNull()
    expect((await call(ohlcvQuery({ sig }))).statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

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
    ['made-up ticker in the old accepted shape', { op: 'resolve', ticker: 'ZZZZQ', network: 'solana' }],
    ['ticker in the wrong case', { op: 'resolve', ticker: 'aaplx', network: 'solana' }],
    ['ticker on a network the app never searches for it', { op: 'resolve', ticker: 'AAPLx', network: 'eth' }],
    ['eth pool in upper case', ohlcvQuery({ network: 'eth', pool: '0xF5294094BCE435BFBD0EC488BE5C462AAF32BC7A' })],
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
    expect(res.body.pool.liquidityUsd).toBe(5)
    expect(res.headers['Cache-Control']).toBe('s-maxage=86400, stale-while-revalidate=604800')
    expect(res.headers['Content-Type']).toMatch(/json/)
  })

  it('hands out eth pool addresses in lower case, the only spelling ohlcv accepts', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            attributes: { address: '0xF5294094BCE435BFBD0EC488BE5C462AAF32BC7A', name: 'NVDAon / USDC', volume_usd: { h24: '1' } },
            relationships: {},
          },
        ],
      }),
    })
    const res = await call({ op: 'resolve', ticker: 'NVDAon', network: 'eth' })
    expect(res.statusCode).toBe(200)
    expect(res.body.pool.address).toBe('0xf5294094bce435bfbd0ec488be5c462aaf32bc7a')
  })

  it('caches a miss for less time than a hit', async () => {
    const res = await call({ op: 'resolve', ticker: 'TSLAx', network: 'solana' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      network: 'solana',
      ticker: 'TSLAx',
      pool: null,
      candidates: [],
      asOf: expect.any(String),
    })
    expect(res.headers['Cache-Control']).toBe('s-maxage=3600, stale-while-revalidate=86400')
  })

  it('stamps asOf with the time the upstream answer arrived', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-24T14:05:00.000Z'))
    try {
      const res = await call({ op: 'resolve', ticker: 'AAPLx', network: 'solana' })
      expect(res.body.asOf).toBe('2026-09-24T14:05:00.000Z')
    } finally {
      vi.useRealTimers()
    }
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

  it('shares a response for an allowed web origin, so a loop of them is served from the edge', async () => {
    const res = await call(ohlcvQuery(), { origin: 'https://onstock.app' })
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://onstock.app')
    expect(res.headers['Cache-Control']).toBe('s-maxage=30, stale-while-revalidate=300')
  })

  it('caches the iPhone app off the app lane the same way as the lane', async () => {
    const res = await call(ohlcvQuery(), { origin: 'capacitor://localhost' })
    expect(res.headers['Access-Control-Allow-Origin']).toBe('capacitor://localhost')
    expect(res.headers['Cache-Control']).toBe('s-maxage=30, stale-while-revalidate=300')
  })

  it('shares the app lane', async () => {
    const res = await call(ohlcvQuery({ c: 'app' }))
    expect(res.headers['Access-Control-Allow-Origin']).toBe('capacitor://localhost')
    expect(res.headers['Cache-Control']).toBe('s-maxage=30, stale-while-revalidate=300')
  })
})

/*
 * The buckets. This endpoint had none: the allowlisted params bounded the
 * cache-key space, but nothing bounded how fast one caller could turn misses
 * into upstream calls against GeckoTerminal's shared ~30/min free tier — the
 * same shape as the Finnhub drain, on an upstream with no key to raise.
 */

/** A caller identified by IP, so cases never share a bucket by accident. */
const from = (ip) => ({ 'x-vercel-forwarded-for': ip })

describe('api/candles — per-caller rate limit', () => {
  it('does not refuse a person flicking between charts', async () => {
    // The instance breaker is the tighter of the two, so keep it out of the
    // way here: this block is about the per-caller bucket on its own.
    for (let i = 0; i < 60; i += 1) {
      limiters.perInstance.reset()
      expect((await call(ohlcvQuery(), from('5.5.5.5'))).statusCode).toBe(200)
    }
  })

  it('stops a caller that keeps going, without reaching upstream', async () => {
    for (let i = 0; i < 60; i += 1) {
      limiters.perInstance.reset()
      await call(ohlcvQuery(), from('6.6.6.6'))
    }
    const spent = fetchMock.mock.calls.length
    const res = await call(ohlcvQuery(), from('6.6.6.6'))
    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: 'too many requests' })
    expect(fetchMock.mock.calls.length).toBe(spent)
  })

  it('never lets the CDN cache one caller rejection for everyone', async () => {
    for (let i = 0; i < 60; i += 1) {
      limiters.perInstance.reset()
      await call(ohlcvQuery(), from('7.7.7.7'))
    }
    const res = await call(ohlcvQuery(), from('7.7.7.7'))
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0)
  })

  it('does not punish a second visitor for the first one', async () => {
    for (let i = 0; i < 61; i += 1) {
      limiters.perInstance.reset()
      await call(ohlcvQuery(), from('8.8.8.8'))
    }
    limiters.perInstance.reset()
    expect((await call(ohlcvQuery(), from('9.9.9.9'))).statusCode).toBe(200)
  })

  it('charges a request the params were going to refuse anyway', async () => {
    for (let i = 0; i < 60; i += 1) await call(ohlcvQuery({ limit: '7' }), from('1.2.3.4'))
    expect((await call(ohlcvQuery(), from('1.2.3.4'))).statusCode).toBe(429)
  })

  it('does not charge a CORS preflight', async () => {
    for (let i = 0; i < 100; i += 1) {
      const res = fakeRes()
      await handler({ method: 'OPTIONS', query: {}, headers: from('5.4.3.2') }, res)
      expect(res.statusCode).toBe(204)
    }
    expect((await call(ohlcvQuery(), from('5.4.3.2'))).statusCode).toBe(200)
  })
})

describe('api/candles — instance circuit breaker', () => {
  it("spends GeckoTerminal's minute and not a call more, whoever is asking", async () => {
    // The per-caller bucket is keyed on a header. This one is not, so forging
    // or rotating that header cannot buy more upstream calls.
    for (let i = 0; i < 30; i += 1) {
      expect((await call(ohlcvQuery(), from(`10.0.0.${i}`))).statusCode).toBe(200)
    }
    expect(fetchMock.mock.calls.length).toBe(30)
    const res = await call(ohlcvQuery(), from('10.1.1.1'))
    expect(res.statusCode).toBe(429)
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(fetchMock.mock.calls.length).toBe(30)
  })

  it('does not charge the budget for a request that never reaches upstream', async () => {
    // A malformed param is refused before the breaker is touched, so a junk
    // loop cannot spend the shared minute that real charts need.
    for (let i = 0; i < 100; i += 1) await call(ohlcvQuery({ pool: 'nope' }), from(`11.0.0.${i % 9}`))
    expect(fetchMock).not.toHaveBeenCalled()
    expect((await call(ohlcvQuery(), from('11.9.9.9'))).statusCode).toBe(200)
  })

  it('counts the resolve lane against the same budget as candles', async () => {
    for (let i = 0; i < 30; i += 1) {
      expect(
        (await call({ op: 'resolve', ticker: 'AAPLx', network: 'solana' }, from(`12.0.0.${i}`)))
          .statusCode
      ).toBe(200)
    }
    const res = await call(ohlcvQuery(), from('12.9.9.9'))
    expect(res.statusCode).toBe(429)
  })

  it('refills at one every two seconds, matching the real upstream limit', async () => {
    const t0 = Date.now()
    for (let i = 0; i < 30; i += 1) expect(limiters.perInstance.take('all', t0).ok).toBe(true)
    expect(limiters.perInstance.take('all', t0).ok).toBe(false)
    expect(limiters.perInstance.take('all', t0 + 1_000).ok).toBe(false)
    expect(limiters.perInstance.take('all', t0 + 2_000).ok).toBe(true)
  })
})
