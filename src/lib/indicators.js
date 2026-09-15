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

/** Weighted moving average: the last n values weighted 1..n, newest heaviest. */
export function wma(values, n) {
  const out = new Array(values?.length ?? 0).fill(null)
  if (!Array.isArray(values) || !(n >= 1)) return out
  const denom = (n * (n + 1)) / 2
  for (let i = n - 1; i < values.length; i++) {
    let sum = 0
    let ok = true
    for (let j = 0; j < n; j++) {
      const v = finite(values[i - n + 1 + j])
      if (v == null) {
        ok = false
        break
      }
      sum += v * (j + 1)
    }
    if (ok) out[i] = sum / denom
  }
  return out
}

/**
 * Rolling population standard deviation over n values — the spread Bollinger
 * Bands are drawn at. Population (÷n), not sample (÷n-1): that is what
 * TradingView's built-in uses, so the bands match.
 */
export function stdev(values, n) {
  const out = new Array(values?.length ?? 0).fill(null)
  if (!Array.isArray(values) || !(n >= 1)) return out
  const means = sma(values, n)
  for (let i = n - 1; i < values.length; i++) {
    const mean = means[i]
    if (mean == null) continue
    let sum = 0
    let ok = true
    for (let j = i - n + 1; j <= i; j++) {
      const v = finite(values[j])
      if (v == null) {
        ok = false
        break
      }
      sum += (v - mean) ** 2
    }
    if (ok) out[i] = Math.sqrt(sum / n)
  }
  return out
}

/**
 * Bollinger Bands: an n-period SMA with bands `mult` standard deviations
 * either side. Returns three index-aligned arrays.
 */
export function bollinger(closes, n = 20, mult = 2) {
  const middle = sma(closes, n)
  const sd = stdev(closes, n)
  const upper = middle.map((m, i) => (m == null || sd[i] == null ? null : m + mult * sd[i]))
  const lower = middle.map((m, i) => (m == null || sd[i] == null ? null : m - mult * sd[i]))
  return { middle, upper, lower }
}

/**
 * MACD: the difference between two EMAs, its own EMA as the signal line, and
 * the gap between them as the histogram.
 *
 * The signal EMA is seeded from the MACD line's first `signal` DEFINED
 * values, not from index 0 — the MACD line is null through the slow EMA's
 * warm-up, and feeding those nulls to ema() would restart its seed forever.
 */
export function macd(closes, fast = 12, slow = 26, signalLen = 9) {
  const fastLine = ema(closes, fast)
  const slowLine = ema(closes, slow)
  const line = fastLine.map((f, i) => (f == null || slowLine[i] == null ? null : f - slowLine[i]))
  // Compact the defined stretch, run the EMA over it, then scatter back.
  const idx = []
  const vals = []
  for (let i = 0; i < line.length; i++) {
    if (line[i] != null) {
      idx.push(i)
      vals.push(line[i])
    }
  }
  const compactSignal = ema(vals, signalLen)
  const signal = new Array(line.length).fill(null)
  for (let k = 0; k < idx.length; k++) signal[idx[k]] = compactSignal[k]
  const histogram = line.map((m, i) => (m == null || signal[i] == null ? null : m - signal[i]))
  return { macd: line, signal, histogram }
}

/**
 * Stochastic oscillator: where the close sits inside the high/low range of
 * the last `kLen` bars, as 0–100. %K is smoothed by `kSmooth`, and %D is the
 * SMA of %K over `dLen`. A flat window (high === low) reads 50 rather than
 * dividing by zero — the price is neither high nor low in its own range.
 */
export function stochastic(candles, kLen = 14, kSmooth = 3, dLen = 3) {
  const n = candles?.length ?? 0
  const raw = new Array(n).fill(null)
  if (!Array.isArray(candles) || !(kLen >= 1)) return { k: raw, d: raw.slice() }
  for (let i = kLen - 1; i < n; i++) {
    let hi = -Infinity
    let lo = Infinity
    let ok = true
    for (let j = i - kLen + 1; j <= i; j++) {
      const h = finite(candles[j]?.high)
      const l = finite(candles[j]?.low)
      if (h == null || l == null) {
        ok = false
        break
      }
      if (h > hi) hi = h
      if (l < lo) lo = l
    }
    const c = finite(candles[i]?.close)
    if (!ok || c == null) continue
    raw[i] = hi === lo ? 50 : ((c - lo) / (hi - lo)) * 100
  }
  const k = kSmooth > 1 ? sma(raw, kSmooth) : raw
  return { k, d: sma(k, dLen) }
}

/**
 * Wilder's Average True Range. True range is the widest of (high-low),
 * |high-prevClose| and |low-prevClose|; the average is Wilder's smoothing,
 * the same recurrence rsi() uses. Undefined on the first bar, which has no
 * previous close.
 */
export function atr(candles, n = 14) {
  const len = candles?.length ?? 0
  const out = new Array(len).fill(null)
  if (!Array.isArray(candles) || !(n >= 1) || len <= n) return out
  const tr = new Array(len).fill(null)
  for (let i = 1; i < len; i++) {
    const h = finite(candles[i]?.high)
    const l = finite(candles[i]?.low)
    const pc = finite(candles[i - 1]?.close)
    if (h == null || l == null || pc == null) continue
    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc))
  }
  // Seed with the plain mean of the first n true ranges (indices 1..n).
  let sum = 0
  for (let i = 1; i <= n; i++) {
    if (tr[i] == null) return out // a hole in the seed window: no ATR at all
    sum += tr[i]
  }
  let prev = sum / n
  out[n] = prev
  for (let i = n + 1; i < len; i++) {
    if (tr[i] == null) continue
    prev = (prev * (n - 1) + tr[i]) / n
    out[i] = prev
  }
  return out
}

/** Rate of change over n bars, as a percentage. Null when the base is 0. */
export function roc(values, n = 9) {
  const out = new Array(values?.length ?? 0).fill(null)
  if (!Array.isArray(values) || !(n >= 1)) return out
  for (let i = n; i < values.length; i++) {
    const v = finite(values[i])
    const base = finite(values[i - n])
    if (v == null || base == null || base === 0) continue
    out[i] = ((v - base) / base) * 100
  }
  return out
}

/**
 * On-balance volume: a running total that adds the bar's volume on an up
 * close and subtracts it on a down close. Starts at 0 on the first bar, so
 * only the SHAPE of the line means anything — its level depends on where the
 * series happens to start.
 */
export function obv(candles) {
  const len = candles?.length ?? 0
  const out = new Array(len).fill(null)
  if (!Array.isArray(candles) || len === 0) return out
  let total = 0
  out[0] = 0
  for (let i = 1; i < len; i++) {
    const c = finite(candles[i]?.close)
    const pc = finite(candles[i - 1]?.close)
    const v = finite(candles[i]?.volume)
    if (c == null || pc == null || v == null) {
      out[i] = total // an unusable bar carries the line forward
      continue
    }
    if (c > pc) total += v
    else if (c < pc) total -= v
    out[i] = total
  }
  return out
}
