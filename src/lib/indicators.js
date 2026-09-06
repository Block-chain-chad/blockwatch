// Pure technical indicators over candle arrays. Nothing here touches the
// network or the DOM, so it is testable in plain node and shared by any chart.
//
// Every function returns an array the SAME LENGTH as its input, with null in
// the warm-up positions where the indicator is not yet defined. Aligning by
// index is what lets a chart overlay the line without re-matching timestamps,
// and null (not 0) is what keeps the warm-up from drawing a line along the
// floor — the same rule as the rest of the app: missing renders as nothing.
//
// Inputs are validated leniently: a non-finite value poisons only the windows
// that include it, which surface as null rather than NaN.

const finite = (v) => (Number.isFinite(v) ? v : null)

/** Simple moving average of the last n values. */
export function sma(values, n) {
  const out = new Array(values?.length ?? 0).fill(null)
  if (!Array.isArray(values) || !(n >= 1)) return out
  let sum = 0
  let bad = 0 // non-finite values inside the current window
  for (let i = 0; i < values.length; i++) {
    const v = finite(values[i])
    if (v == null) bad++
    else sum += v
    if (i >= n) {
      const gone = finite(values[i - n])
      if (gone == null) bad--
      else sum -= gone
    }
    if (i >= n - 1 && bad === 0) out[i] = sum / n
  }
  return out
}

/**
 * Exponential moving average, seeded with the SMA of the first n values (the
 * textbook convention, which is also what TradingView plots), then
 * ema = prev + k * (value - prev) with k = 2 / (n + 1).
 */
export function ema(values, n) {
  const out = new Array(values?.length ?? 0).fill(null)
  if (!Array.isArray(values) || !(n >= 1)) return out
  const k = 2 / (n + 1)
  let prev = null
  let seedSum = 0
  for (let i = 0; i < values.length; i++) {
    const v = finite(values[i])
    if (v == null) {
      // A hole restarts the seed: an EMA carried over a gap would be a guess.
      prev = null
      seedSum = 0
      continue
    }
    if (prev == null) {
      // Seeding phase: need n consecutive finite values.
      const start = i - n + 1
      if (start < 0 || values.slice(start, i + 1).some((x) => finite(x) == null)) {
        continue
      }
      seedSum = 0
      for (let j = start; j <= i; j++) seedSum += values[j]
      prev = seedSum / n
    } else {
      prev = prev + k * (v - prev)
    }
    out[i] = prev
  }
  return out
}

/**
 * Wilder's RSI over closes. First value at index n uses the plain average of
 * the first n gains/losses; afterwards avg = (prev * (n - 1) + current) / n.
 * 100 when there were no losses in the window (avgLoss = 0), 0 when no gains.
 */
export function rsi(closes, n = 14) {
  const out = new Array(closes?.length ?? 0).fill(null)
  if (!Array.isArray(closes) || !(n >= 1) || closes.length <= n) return out
  if (closes.some((c) => finite(c) == null)) return out
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= n; i++) {
    const d = closes[i] - closes[i - 1]
    if (d > 0) avgGain += d
    else avgLoss -= d
  }
  avgGain /= n
  avgLoss /= n
  const toRsi = (g, l) => (l === 0 ? 100 : g === 0 ? 0 : 100 - 100 / (1 + g / l))
  out[n] = toRsi(avgGain, avgLoss)
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    avgGain = (avgGain * (n - 1) + (d > 0 ? d : 0)) / n
    avgLoss = (avgLoss * (n - 1) + (d < 0 ? -d : 0)) / n
    out[i] = toRsi(avgGain, avgLoss)
  }
  return out
}

/**
 * Cumulative volume-weighted average price over the candles given, using the
 * typical price (high + low + close) / 3. The caller decides the session — an
 * intraday VWAP resets each day, so pass one day's candles for that reading.
 * Null until the first candle with volume; a run of zero-volume candles at
 * the start has no price to weight. A malformed candle later on is skipped
 * and the running value carried forward.
 */
export function vwap(candles) {
  const out = new Array(candles?.length ?? 0).fill(null)
  if (!Array.isArray(candles)) return out
  let pv = 0
  let vol = 0
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    const h = finite(c?.high)
    const l = finite(c?.low)
    const cl = finite(c?.close)
    const v = finite(c?.volume)
    if (h != null && l != null && cl != null && v != null && v >= 0) {
      pv += ((h + l + cl) / 3) * v
      vol += v
    }
    // A broken row does not move the average; the line carries on rather
    // than breaking for one bad candle.
    if (vol > 0) out[i] = pv / vol
  }
  return out
}
