/**
 * Number formatting.
 *
 * Adapted from DefiLlama's shipped formatter (read out of their bundle), which
 * is the most carefully considered numeric layer of any site we tore down —
 * with one deliberate correction and one addition:
 *
 *   CORRECTION: they render missing data as `$0`, 119 times on a single page,
 *   so "no data" is indistinguishable from "measured zero". For us that is
 *   worse than cosmetic: a failed underlying quote would render a 0.00%
 *   premium that looks real. Missing renders as an em dash. Always.
 *
 *   ADDITION: compaction is hard-blocked on percentages and prices. That is
 *   exactly how TradingView ships `259.37 K%` on their flagship symbol page —
 *   a generic K/M/B/T helper wired into every numeric slot without asking what
 *   unit it carries.
 *
 * Sign is carried by the CHARACTER, never by color alone. rwa.xyz's metric
 * tiles render a decline as `▼ 10.74%` with no minus sign, so in grayscale, in
 * a screenshot, or to a colorblind user a loss reads as a gain. We always emit
 * an explicit + or −, and use U+2212 MINUS (not hyphen-minus) so the glyph is
 * the same width as + in tabular figures and columns align.
 */

export const EM_DASH = '—'
const MINUS = '−'

/* Intl.NumberFormat construction is the expensive part; the formatting call is
   cheap. DefiLlama memoises on a stringified key — same here. */
const cache = new Map()
const nf = (opts) => {
  const key = JSON.stringify(opts)
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat('en-US', opts)
    cache.set(key, f)
  }
  return f
}

/** Anything that isn't a real, finite number is missing — not zero. */
export function isMissing(n) {
  return n === null || n === undefined || typeof n !== 'number' || !Number.isFinite(n)
}

/* Normalise -0 so it can never render as "−0.00%". */
const denormalise = (n) => (Object.is(n, -0) ? 0 : n)

/** Swap the hyphen Intl emits for a true minus sign. */
const trueMinus = (s) => s.replace(/-/g, MINUS)

/**
 * Decimal places by magnitude, not by instrument. Their rule verbatim:
 * 3 decimals at or above a billion, 2 below.
 */
const decimalsFor = (n) => (Math.abs(n) >= 1e9 ? 3 : 2)

/**
 * Sub-1 values get MORE precision, not less, so a $0.058 token price doesn't
 * collapse to $0.06. Scales with -log10, capped at 10.
 */
const adaptiveDecimals = (n, base = 2) => {
  const a = Math.abs(n)
  if (a === 0 || a >= 1) return base
  return Math.min(10, Math.max(base, Math.max(0, Math.ceil(-Math.log10(a)) - 1) + base))
}

/**
 * A share price. ALWAYS 2dp above $1 so decimal points line up down a column,
 * adaptive below $1 so cheap tokens keep their significant digits.
 * Never compacted — a price is a price.
 */
export function formatPrice(n) {
  if (isMissing(n)) return EM_DASH
  const v = denormalise(n)
  const d = adaptiveDecimals(v, 2)
  return trueMinus(
    '$' + nf({ minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
  )
}

/**
 * A percentage change or premium/discount.
 * 2dp normally, 0dp above ±100% (a 4-digit percentage doesn't need cents).
 * Exact zero is the literal "0%" — never "+0.00%".
 * A tiny non-zero renders as a threshold rather than a lying "0.00%".
 */
export function formatPct(n, { sign = true } = {}) {
  if (isMissing(n)) return EM_DASH
  const v = denormalise(n)
  if (v === 0) return '0%'
  if (Math.abs(v) < 0.01) return v < 0 ? `${MINUS}<0.01%` : '<0.01%'
  const d = Math.abs(v) > 100 ? 0 : 2
  const body = nf({ minimumFractionDigits: d, maximumFractionDigits: d }).format(Math.abs(v))
  const prefix = v < 0 ? MINUS : sign ? '+' : ''
  return `${prefix}${body}%`
}

/**
 * Big aggregate figures only — market cap, volume. Lowercase suffix, as
 * DefiLlama does via a regex post-pass on Intl's output ($75.7b, not $75.7B).
 * Compaction only engages above 1e3; below that you get the grouped number.
 */
export function formatCompact(n) {
  if (isMissing(n)) return EM_DASH
  const v = denormalise(n)
  if (Math.abs(v) < 1e3) {
    return trueMinus('$' + nf({ maximumFractionDigits: 0 }).format(v))
  }
  const d = decimalsFor(v)
  const s = nf({
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  }).format(v)
  return trueMinus('$' + s.replace(/([KMBT])$/, (m) => m.toLowerCase()))
}

/**
 * The opening of the thinly traded note: how much of the token changed hands
 * in the last 24 hours. Unknown volume, or an amount that would round to $0,
 * gets its own wording instead of "About $0" or "About very little".
 */
export function thinVolumeText(volume24h) {
  const v = isMissing(volume24h) ? null : denormalise(volume24h)
  if (v == null || !(v >= 0.5)) return 'Very little of this token changed hands in 24 hours'
  return `About ${formatCompact(v)} changed hands in 24 hours`
}

/** A plain count — holders, assets. Grouped, never compacted below 1e3. */
export function formatCount(n) {
  if (isMissing(n)) return EM_DASH
  return trueMinus(nf({ maximumFractionDigits: 0 }).format(denormalise(n)))
}

/**
 * Direction as a Tailwind text class. Colour is REINFORCEMENT for the sign
 * character, never the carrier of it. Missing is tertiary, not neutral-green.
 */
export function changeColor(n) {
  if (isMissing(n)) return 'text-zinc-500'
  if (n > 0) return 'text-gain'
  if (n < 0) return 'text-loss'
  return 'text-zinc-400'
}

/**
 * Is a figure plausible enough to promote to a headline slot?
 *
 * The News digest currently publishes "Biggest 24h move — WMKT −47.60%", which
 * is near-certainly a thin or broken token presented in the same voice as
 * everything else. TradingView ships the identical class of bug (a −10,172.30
 * USD EPS rendered with full confidence and 2dp precision). Superlatives get
 * gated; the raw number still shows on the asset's own row.
 */
export function isPlausiblePct(n, limit = 25) {
  return !isMissing(n) && Math.abs(n) <= limit
}

export function timeAgo(ts) {
  if (isMissing(ts)) return EM_DASH
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
