import { describe, it, expect } from 'vitest'
import { VERIFIED_ONDO, ONDO_VERIFIED_AT, ONDO_ORACLE, ondoSharesPerToken } from './verifiedOndo'
import { BY_ID } from './universe'
import {
  encodeAddress,
  decodeString,
  decodeSValue,
  formatFixed18,
  oracleDisagreement,
  MAX_ORACLE_DISAGREEMENT,
} from '../../scripts/verify-ondo.mjs'

/*
 * The pinned Ondo multipliers. What is guarded: every pin is well formed and
 * belongs to an Ondo asset in the universe with the same ticker, the lookup
 * fails closed, and the script's decoders read the oracle's answers exactly.
 * Values themselves are not asserted beyond shape: they are re-read from the
 * chain and legitimately move with every dividend.
 */

describe('the pinned list', () => {
  it('records when and where it was read', () => {
    expect(ONDO_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/)
    expect(ONDO_ORACLE).toMatchObject({ chain: 'bsc', address: '0xF4Fd8a1B412633e10527454137A29Db7Aa35F15e' })
  })

  it('pins only Ondo assets from the universe, under their own tickers', () => {
    const entries = Object.entries(VERIFIED_ONDO)
    expect(entries.length).toBeGreaterThan(200)
    for (const [id, pin] of entries) {
      expect(BY_ID[id]?.issuer, id).toBe('Ondo')
      expect(pin.ticker, id).toBe(BY_ID[id].ticker)
      expect(pin.address, id).toMatch(/^0x[0-9a-f]{40}$/)
      expect(pin.sValue, id).toMatch(/^\d+(\.\d+)?$/)
      expect(Number(pin.sValue), id).toBeGreaterThan(0)
    }
  })
})

describe('ondoSharesPerToken', () => {
  it('fails closed for anything not pinned, not Ondo, or paused', () => {
    expect(ondoSharesPerToken(BY_ID['netflix-xstock'])).toBeNull()
    expect(ondoSharesPerToken({ issuer: 'Ondo', id: 'nope', ticker: 'NOPEon' })).toBeNull()
    expect(ondoSharesPerToken(null)).toBeNull()
  })
})

describe('verify-ondo decoders', () => {
  it('encodes an address argument', () => {
    expect(encodeAddress('0x7048F5227b032326cc8dbc53cf3fddd947a2c757')).toBe(
      '0000000000000000000000007048f5227b032326cc8dbc53cf3fddd947a2c757',
    )
  })

  it("decodes symbol() as the chain returned it for NFLXon", () => {
    const hex =
      '0x0000000000000000000000000000000000000000000000000000000000000020' +
      '0000000000000000000000000000000000000000000000000000000000000006' +
      '4e464c586f6e0000000000000000000000000000000000000000000000000000'
    expect(decodeString(hex)).toBe('NFLXon')
    expect(decodeString('0x')).toBeNull()
  })

  it("decodes getSValue as the oracle returned it for NFLXon (10.0, not paused)", () => {
    const hex =
      '0x0000000000000000000000000000000000000000000000008ac7230489e80000' +
      '0000000000000000000000000000000000000000000000000000000000000000'
    expect(decodeSValue(hex)).toEqual({ sValue: '10', paused: false })
    expect(decodeSValue('0x' + '0'.repeat(128))).toBeNull()
  })

  it('formats 18-decimal fixed point exactly', () => {
    expect(formatFixed18(1_018_588_387_568_579_396n)).toBe('1.018588387568579396')
    expect(formatFixed18(66_667_000_000_000_000n)).toBe('0.066667')
  })
})

describe('the Ethereum oracle cross-check', () => {
  it('accepts the update lag measured on 2026-09-26 and refuses a missed split', () => {
    expect(oracleDisagreement('1.007720910150127119', '1.0094730727840429')).toBeLessThan(MAX_ORACLE_DISAGREEMENT)
    expect(oracleDisagreement('1', '1')).toBe(0)
    expect(oracleDisagreement('10', '1')).toBeGreaterThan(MAX_ORACLE_DISAGREEMENT)
    expect(oracleDisagreement('0', '1')).toBeNull()
  })
})
