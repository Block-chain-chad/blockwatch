// Pure yield-curve arithmetic. Lives in lib/ rather than services/ because it
// touches no network and no browser globals — services/apiBase.js reads
// window.location at module load, so anything importing a service is
// unavailable to a plain node test.

/**
 * The 2s10s spread in basis points — the ten-year yield minus the two-year —
 * or null when either leg is missing.
 *
 * This is the bond market's equivalent of the premium: not printed anywhere on
 * the curve itself, and the one number people actually watch. Quoted in bp to
 * match the digest's issuer gap, with a Learn card explaining the unit.
 *
 * Returned as whole basis points rather than a float because 4.65 - 4.19 is
 * 0.46000000000000085 in binary floating point, which is not a number to hand
 * to a formatter. A negative result means an inverted curve; the sign carries
 * the meaning, so it must survive intact.
 */
export function twosTensSpreadBp(series) {
  const two = series?.DGS2?.value
  const ten = series?.DGS10?.value
  if (!Number.isFinite(two) || !Number.isFinite(ten)) return null
  return Math.round((ten - two) * 100)
}
