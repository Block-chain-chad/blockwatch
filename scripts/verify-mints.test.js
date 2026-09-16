import { describe, it, expect } from 'vitest'
import { judgeMint } from './verify-mints.mjs'

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
