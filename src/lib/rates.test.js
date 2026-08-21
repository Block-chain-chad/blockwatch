import { describe, it, expect } from 'vitest'
import { twosTensSpreadBp } from './rates'

/*
 * The spread is a subtraction of two floats that must land on a clean integer
 * count of basis points. 4.65 - 4.19 is 0.46000000000000085 in binary floating
 * point, so the rounding is the test, not a formality.
 *
 * The sign carries meaning — negative is an inverted curve — so it must
 * survive intact rather than being absolute-valued somewhere on the way out.
 */

const at = (two, ten) => ({ DGS2: { value: two }, DGS10: { value: ten } })

describe('twosTensSpreadBp', () => {
  it('returns whole basis points despite float subtraction', () => {
    expect(twosTensSpreadBp(at(4.19, 4.65))).toBe(46)
    expect(twosTensSpreadBp(at(4.17, 4.68))).toBe(51)
  })

  it('keeps the sign when the curve is inverted', () => {
    expect(twosTensSpreadBp(at(4.65, 4.19))).toBe(-46)
  })

  it('reports a flat curve as zero, not as missing', () => {
    expect(twosTensSpreadBp(at(4.5, 4.5))).toBe(0)
  })

  it('is null when either leg is missing', () => {
    expect(twosTensSpreadBp({ DGS2: { value: 4.19 } })).toBeNull()
    expect(twosTensSpreadBp({ DGS10: { value: 4.65 } })).toBeNull()
    expect(twosTensSpreadBp({})).toBeNull()
    expect(twosTensSpreadBp(null)).toBeNull()
    expect(twosTensSpreadBp(at(4.19, undefined))).toBeNull()
  })
})
