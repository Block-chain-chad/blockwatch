// The indicator catalogue: what the Indicators dialog searches, what an
// active indicator is, and how each one turns candles into plottable lines.
// Pure — no React, no DOM, no services — so plain node can test it and both
// the phone chips and the desktop dialog can read the same list.
//
// An ACTIVE indicator is a string key: the entry id, then its parameter
// values in declared order, colon-separated ("sma:20", "bb:20:2"). A string
// rather than an object because the active list is persisted in
// localStorage: a key either parses against the catalogue or it does not,
// so a stale or hand-edited value can never half-load. buildKey/parseKey are
// the only two places that know the encoding.
//
// TradingView caps its free tier at two indicators per chart. We do not cap,
// but the colour cycle below is three long on purpose: past three lines on
// one pane nobody can tell them apart, and this design system has no fourth
// line colour that is not already semantic (gain/loss mean direction).

import { sma, ema, wma, rsi, vwap, bollinger, macd, stochastic, atr, roc, obv } from './indicators'

/** Line colours, cycled per active instance so two SMAs never look alike. */
export const LINE_TONES = Object.freeze(['primary', 'secondary', 'muted'])

/**
 * The three the phone's chip row offers directly. A phone has no room for a
 * search dialog over eleven entries, and these are the three the toolbar has
 * always shown — so the small screen keeps its one-tap row and the catalogue
 * stays a desktop affordance.
 */
export const QUICK_KEYS = Object.freeze(['sma:20', 'ema:50', 'rsi:14'])

const closesOf = (candles) => candles.map((c) => c.close)

/*
 * Each entry:
 *   id          short stable slug, the first field of a key
 *   name        what the dialog lists and the legend prints
 *   short       the toolbar chip's word when space is tight
 *   category    the dialog's left-hand grouping
 *   pane        'overlay' (on the price scale) | 'separate' (its own pane)
 *   params      ordered; their values make up the rest of the key
 *   plots       one per line the indicator draws
 *   scale       fixed range and reference bands, for bounded oscillators
 *   compute     (candles, params) -> { [plotId]: (number|null)[] }
 *   keywords    extra search terms that are not in the name
 */
export const CATALOG = Object.freeze([
  {
    id: 'sma',
    name: 'Simple Moving Average',
    short: 'SMA',
    category: 'Moving averages',
    pane: 'overlay',
    params: [{ name: 'length', label: 'Length', type: 'int', default: 20, min: 1, max: 500 }],
    plots: [{ id: 'sma', label: 'SMA', tone: 'primary' }],
    keywords: ['ma', 'mean', 'average', 'trend'],
    description: 'The average close over the last N bars.',
    compute: (candles, p) => ({ sma: sma(closesOf(candles), p.length) }),
  },
  {
    id: 'ema',
    name: 'Exponential Moving Average',
    short: 'EMA',
    category: 'Moving averages',
    pane: 'overlay',
    params: [{ name: 'length', label: 'Length', type: 'int', default: 50, min: 1, max: 500 }],
    plots: [{ id: 'ema', label: 'EMA', tone: 'primary' }],
    keywords: ['ma', 'average', 'trend', 'exponential'],
    description: 'A moving average that weights recent bars more heavily.',
    compute: (candles, p) => ({ ema: ema(closesOf(candles), p.length) }),
  },
  {
    id: 'wma',
    name: 'Weighted Moving Average',
    short: 'WMA',
    category: 'Moving averages',
    pane: 'overlay',
    params: [{ name: 'length', label: 'Length', type: 'int', default: 20, min: 1, max: 500 }],
    plots: [{ id: 'wma', label: 'WMA', tone: 'primary' }],
    keywords: ['ma', 'average', 'linear', 'trend'],
    description: 'A moving average whose weights rise linearly to the newest bar.',
    compute: (candles, p) => ({ wma: wma(closesOf(candles), p.length) }),
  },
  {
    id: 'vwap',
    name: 'Volume Weighted Average Price',
    short: 'VWAP',
    category: 'Moving averages',
    pane: 'overlay',
    params: [],
    plots: [{ id: 'vwap', label: 'VWAP', tone: 'primary' }],
    keywords: ['volume', 'average', 'price', 'institutional'],
    description: 'Average price weighted by volume, accumulated across the loaded bars.',
    compute: (candles) => ({ vwap: vwap(candles) }),
  },
  {
    id: 'bb',
    name: 'Bollinger Bands',
    short: 'BB',
    category: 'Volatility',
    pane: 'overlay',
    params: [
      { name: 'length', label: 'Length', type: 'int', default: 20, min: 2, max: 500 },
      { name: 'mult', label: 'Std dev', type: 'float', default: 2, min: 0.1, max: 10, step: 0.1 },
    ],
    plots: [
      { id: 'upper', label: 'Upper', tone: 'muted' },
      { id: 'middle', label: 'Basis', tone: 'primary' },
      { id: 'lower', label: 'Lower', tone: 'muted' },
    ],
    keywords: ['volatility', 'bands', 'deviation', 'squeeze'],
    description: 'A moving average with bands set a number of standard deviations away.',
    compute: (candles, p) => bollinger(closesOf(candles), p.length, p.mult),
  },
  {
    id: 'atr',
    name: 'Average True Range',
    short: 'ATR',
    category: 'Volatility',
    pane: 'separate',
    params: [{ name: 'length', label: 'Length', type: 'int', default: 14, min: 1, max: 500 }],
    plots: [{ id: 'atr', label: 'ATR', tone: 'primary' }],
    keywords: ['volatility', 'range', 'wilder', 'stop'],
    description: 'How far price typically travels in a bar, smoothed.',
    compute: (candles, p) => ({ atr: atr(candles, p.length) }),
  },
  {
    id: 'rsi',
    name: 'Relative Strength Index',
    short: 'RSI',
    category: 'Oscillators',
    pane: 'separate',
    params: [{ name: 'length', label: 'Length', type: 'int', default: 14, min: 2, max: 500 }],
    plots: [{ id: 'rsi', label: 'RSI', tone: 'primary' }],
    scale: { min: 0, max: 100, bands: [30, 70], decimals: 0 },
    keywords: ['momentum', 'overbought', 'oversold', 'wilder'],
    description: 'Momentum as 0–100; above 70 is often read as overbought.',
    compute: (candles, p) => ({ rsi: rsi(closesOf(candles), p.length) }),
  },
  {
    id: 'stoch',
    name: 'Stochastic Oscillator',
    short: 'Stoch',
    category: 'Oscillators',
    pane: 'separate',
    params: [
      { name: 'k', label: '%K length', type: 'int', default: 14, min: 1, max: 500 },
      { name: 'smooth', label: '%K smoothing', type: 'int', default: 3, min: 1, max: 100 },
      { name: 'd', label: '%D length', type: 'int', default: 3, min: 1, max: 100 },
    ],
    plots: [
      { id: 'k', label: '%K', tone: 'primary' },
      { id: 'd', label: '%D', tone: 'secondary' },
    ],
    scale: { min: 0, max: 100, bands: [20, 80], decimals: 0 },
    keywords: ['momentum', 'overbought', 'oversold', 'kd'],
    description: 'Where the close sits inside the recent high–low range.',
    compute: (candles, p) => stochastic(candles, p.k, p.smooth, p.d),
  },
  {
    id: 'macd',
    name: 'MACD',
    short: 'MACD',
    category: 'Oscillators',
    pane: 'separate',
    params: [
      { name: 'fast', label: 'Fast length', type: 'int', default: 12, min: 1, max: 500 },
      { name: 'slow', label: 'Slow length', type: 'int', default: 26, min: 1, max: 500 },
      { name: 'signal', label: 'Signal length', type: 'int', default: 9, min: 1, max: 500 },
    ],
    plots: [
      { id: 'macd', label: 'MACD', tone: 'primary' },
      { id: 'signal', label: 'Signal', tone: 'secondary' },
    ],
    scale: { zeroLine: true },
    keywords: ['momentum', 'convergence', 'divergence', 'crossover', 'trend'],
    description: 'The gap between a fast and a slow moving average, plus its signal line.',
    compute: (candles, p) => {
      const r = macd(closesOf(candles), p.fast, p.slow, p.signal)
      return { macd: r.macd, signal: r.signal }
    },
  },
  {
    id: 'roc',
    name: 'Rate of Change',
    short: 'ROC',
    category: 'Momentum',
    pane: 'separate',
    params: [{ name: 'length', label: 'Length', type: 'int', default: 9, min: 1, max: 500 }],
    plots: [{ id: 'roc', label: 'ROC', tone: 'primary' }],
    scale: { zeroLine: true, decimals: 2 },
    keywords: ['momentum', 'percent', 'change', 'velocity'],
    description: 'Percentage change against the close N bars ago.',
    compute: (candles, p) => ({ roc: roc(closesOf(candles), p.length) }),
  },
  {
    id: 'obv',
    name: 'On Balance Volume',
    short: 'OBV',
    category: 'Volume',
    pane: 'separate',
    params: [],
    plots: [{ id: 'obv', label: 'OBV', tone: 'primary' }],
    keywords: ['volume', 'accumulation', 'distribution', 'flow'],
    description: 'A running volume total that rises on up closes and falls on down closes.',
    compute: (candles) => ({ obv: obv(candles) }),
  },
])

/** Category names in dialog order. */
export const CATEGORIES = Object.freeze([
  ...new Set(CATALOG.map((e) => e.category)),
])

const BY_ID = new Map(CATALOG.map((e) => [e.id, e]))

/** The catalogue entry for an id, or null. */
export function indicatorById(id) {
  return BY_ID.get(id) ?? null
}

// --- Keys ---------------------------------------------------------------

/** A parameter value coerced into its declared type and range. */
function coerceParam(spec, raw) {
  const n = typeof raw === 'string' ? Number(raw) : raw
  if (!Number.isFinite(n)) return spec.default
  const clamped = Math.min(spec.max, Math.max(spec.min, n))
  return spec.type === 'int' ? Math.round(clamped) : clamped
}

/** Every declared parameter, defaults filled in and values clamped. */
export function normalizeParams(entry, params = {}) {
  const out = {}
  for (const spec of entry.params) out[spec.name] = coerceParam(spec, params[spec.name])
  return out
}

/** The default parameters for an entry. */
export function defaultParams(entry) {
  return normalizeParams(entry, {})
}

/** "sma:20" from ('sma', { length: 20 }). Values in declared order. */
export function buildKey(id, params = {}) {
  const entry = indicatorById(id)
  if (!entry) return null
  const p = normalizeParams(entry, params)
  const parts = entry.params.map((spec) => String(p[spec.name]))
  return [id, ...parts].join(':')
}

/** { entry, params } from a key, or null when the id is unknown. */
export function parseKey(key) {
  if (typeof key !== 'string') return null
  const [id, ...rest] = key.split(':')
  const entry = indicatorById(id)
  if (!entry) return null
  const params = {}
  entry.params.forEach((spec, i) => {
    params[spec.name] = rest[i]
  })
  return { entry, params: normalizeParams(entry, params) }
}

/**
 * A stored list made safe: unknown ids dropped, parameters clamped,
 * duplicates removed, order kept. Anything that is not an array reads as
 * empty rather than throwing — this runs on whatever localStorage held.
 */
export function normalizeKeys(list) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const key of list) {
    const parsed = parseKey(key)
    if (!parsed) continue
    const canonical = buildKey(parsed.entry.id, parsed.params)
    if (!out.includes(canonical)) out.push(canonical)
  }
  return out
}

/** The legend's name for a key: "SMA 20", "BB 20 2", "VWAP". */
export function describeKey(key) {
  const parsed = parseKey(key)
  if (!parsed) return ''
  const { entry, params } = parsed
  const values = entry.params.map((spec) => params[spec.name])
  return values.length ? `${entry.short} ${values.join(' ')}` : entry.short
}

// --- Search -------------------------------------------------------------

/**
 * Catalogue entries matching a query, best first. Ranking, high to low:
 * the short name typed exactly ("rsi"), a word in the name starting with
 * the query, the name containing it anywhere, then a keyword hit. An empty
 * query returns everything in catalogue order, which is what the dialog
 * shows before anyone types.
 */
export function searchIndicators(query) {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return [...CATALOG]
  const scored = []
  for (const entry of CATALOG) {
    const short = entry.short.toLowerCase()
    const name = entry.name.toLowerCase()
    let score = 0
    if (short === q) score = 100
    else if (short.startsWith(q)) score = 90
    else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 70
    else if (name.includes(q)) score = 50
    else if (entry.category.toLowerCase().includes(q)) score = 40
    else if (entry.keywords.some((k) => k.includes(q))) score = 30
    if (score > 0) scored.push({ entry, score })
  }
  // Stable within a score: catalogue order decides, so the list never
  // reshuffles between two equally good matches.
  return scored
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((s) => s.entry)
}

// --- Computing ----------------------------------------------------------

/**
 * One active indicator's plots over a clean candle array:
 * [{ id, label, tone, values }]. An unknown key yields an empty list rather
 * than throwing — the same rule as everywhere else, missing renders as
 * nothing. `candles` must already be cleaned (ascending, no holes).
 */
export function computePlots(key, candles) {
  const parsed = parseKey(key)
  if (!parsed || !Array.isArray(candles) || candles.length === 0) return []
  const { entry, params } = parsed
  let result
  try {
    result = entry.compute(candles, params)
  } catch {
    return []
  }
  return entry.plots.map((plot) => ({
    id: plot.id,
    label: plot.label,
    tone: plot.tone,
    values: Array.isArray(result?.[plot.id]) ? result[plot.id] : [],
  }))
}
