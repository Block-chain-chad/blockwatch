import { describe, it, expect } from 'vitest'
import { judgeMint, readMultiplier } from './verify-mints.mjs'

/*
 * judgeMint is the rule that decides which token addresses the app will spend
 * money at. A loosened check here silently re-opens the hole the pinned list
 * closes, so every way of being wrong gets a test.
 */

const issuer = {
  updateAuthority: '5aMNNLQJwAEeoemTEMkv5NVjqKwvvefRYCQ5Z67HFvEq',
  metadataHost: 'xstocks-metadata.backed.fi',
}
const asset = { ticker: 'GOOGLx', id: 'alphabet-xstock' }

// Shaped on the real jsonParsed mint account for GOOGLx.
const account = (metaOver = {}, over = {}) => ({
  owner: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  data: {
    parsed: {
      info: {
        decimals: 8,
        extensions: [
          { extension: 'permanentDelegate', state: {} },
          {
            extension: 'tokenMetadata',
            state: {
              name: 'Alphabet xStock',
              symbol: 'GOOGLx',
              updateAuthority: issuer.updateAuthority,
              uri: 'https://xstocks-metadata.backed.fi/tokens/Solana/GOOGLx/metadata.json',
              ...metaOver,
            },
          },
        ],
        ...over,
      },
    },
  },
})

describe('judgeMint', () => {
  it("accepts a mint the issuer signs for, and takes its decimals from the chain", () => {
    expect(judgeMint({ account: account(), asset, issuer })).toEqual({
      ok: true,
      decimals: 8,
      symbol: 'GOOGLx',
      name: 'Alphabet xStock',
    })
  })

  it('rejects an address with nothing at it', () => {
    expect(judgeMint({ account: null, asset, issuer }).ok).toBe(false)
  })

  it('rejects a mint from a different token program', () => {
    const legacy = { ...account(), owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }
    expect(judgeMint({ account: legacy, asset, issuer }).ok).toBe(false)
  })

  it('rejects a mint with no on-chain metadata at all', () => {
    const bare = account()
    bare.data.parsed.info.extensions = []
    expect(judgeMint({ account: bare, asset, issuer }).ok).toBe(false)
  })

  it('rejects a lookalike whose metadata someone else controls', () => {
    // This is the whole attack: same name, same symbol, not the issuer.
    const impostor = account({ updateAuthority: 'ImpostorAuthority111111111111111111111111' })
    expect(judgeMint({ account: impostor, asset, issuer }).ok).toBe(false)
  })

  it('rejects metadata hosted anywhere but the issuer', () => {
    for (const uri of [
      'https://xstocks-metadata.backed.fi.evil.com/x.json',
      'https://backed.fi/x.json',
      'not a url',
    ]) {
      expect(judgeMint({ account: account({ uri }), asset, issuer }).ok, uri).toBe(false)
    }
  })

  it('rejects a mint whose on-chain symbol is a different stock', () => {
    // Buying TSLAx when the screen said GOOGLx is the failure that matters.
    expect(judgeMint({ account: account({ symbol: 'TSLAx' }), asset, issuer }).ok).toBe(false)
  })

  it('rejects unusable decimals rather than mis-sizing a trade', () => {
    for (const decimals of [-1, 6.5, null, undefined, 'six', 99]) {
      expect(judgeMint({ account: account({}, { decimals }), asset, issuer }).ok, `${decimals}`).toBe(
        false
      )
    }
  })
})

/*
 * readMultiplier — the issuer's share-per-token ratio, off the mint account.
 *
 * This decides the number that later sizes a sell. Its guards used to fail
 * silently: an unreadable multiplier wrote an entry with no ratio, which the
 * client reads as 1.0, and a bad effective timestamp dropped the scheduled
 * value. All 66 scaled mints take their ratio from newMultiplier — NFLXx's
 * standing field still says "1" while the real ratio is 10 — so either
 * silence would have pinned NFLXx as one token per share and oversold every
 * holder tenfold. Both now throw, which stops the run and leaves the good
 * file in place.
 */
const scaled = (state) => ({
  data: { parsed: { info: { extensions: [{ extension: 'scaledUiAmountConfig', state }] } } },
})

describe('readMultiplier', () => {
  it('pins both values and the effective time for a scheduled change', () => {
    // NFLXx's real shape: standing 1, scheduled 10, effective in the past.
    expect(
      readMultiplier(
        scaled({ multiplier: '1', newMultiplier: '10', newMultiplierEffectiveTimestamp: 1763337300 })
      )
    ).toEqual({
      multiplier: '1',
      nextMultiplier: '10',
      nextMultiplierAt: '2025-11-16T23:55:00.000Z',
    })
  })

  it('pins the scheduled value as the standing one when it is already in force', () => {
    // TSLAx's real shape: a zero timestamp means the scheduled value applies
    // now, so there is no future change worth recording and no 1970 date.
    expect(
      readMultiplier(
        scaled({ multiplier: '1', newMultiplier: '1', newMultiplierEffectiveTimestamp: 0 })
      )
    ).toEqual({ multiplier: '1' })
  })

  it('pins the standing value alone when nothing is scheduled', () => {
    expect(readMultiplier(scaled({ multiplier: '1.05' }))).toEqual({ multiplier: '1.05' })
  })

  it('returns nothing for a mint that carries no such extension', () => {
    // Not an error: a plain Token-2022 mint the issuer never scaled. One token
    // is one share and the client's default is right.
    expect(readMultiplier({ data: { parsed: { info: { extensions: [] } } } })).toBeNull()
    expect(readMultiplier(null)).toBeNull()
  })

  it('THROWS on an unreadable multiplier rather than pinning a silent 1.0', () => {
    for (const bad of ['', 'abc', '-1', '0', null, undefined, NaN, {}]) {
      expect(() => readMultiplier(scaled({ multiplier: bad })), `accepted ${JSON.stringify(bad)}`).toThrow(
        /multiplier is unreadable/
      )
    }
  })

  it('THROWS on an unreadable scheduled value', () => {
    expect(() =>
      readMultiplier(
        scaled({ multiplier: '1', newMultiplier: 'abc', newMultiplierEffectiveTimestamp: 1763337300 })
      )
    ).toThrow(/newMultiplier is unreadable/)
  })

  it('THROWS on an unreadable effective timestamp rather than dropping the change', () => {
    // This is the one that would have pinned NFLXx as 1.0.
    for (const bad of ['soon', null, undefined, NaN]) {
      expect(() =>
        readMultiplier(
          scaled({ multiplier: '1', newMultiplier: '10', newMultiplierEffectiveTimestamp: bad })
        )
      ).toThrow(/effective timestamp is unreadable/)
    }
  })

  it('refuses exponent notation, which the client cannot read as a fraction', () => {
    expect(() => readMultiplier(scaled({ multiplier: '1e-7' }))).toThrow(/multiplier is unreadable/)
  })
})
