// The browser-tab title on the desktop (spec A21, §6.9): TradingView's
// grammar — the quote itself, no product suffix — with the one thing
// TradingView cannot do: in Gap mode the gap replaces the price, so the tab
// answers the product's question. Pure; the desktop components call it from
// an effect and phones never touch document.title.

/** main.jsx / index.html's default, restored when nothing is open. */
export const DEFAULT_TITLE = 'Onstock · Tokenized Stock Tracker'

const UP = '▲' // ▲
const DOWN = '▼' // ▼
const MINUS = '−' // − (a real minus, not a hyphen)

/** A signed percentage with a real minus sign: '+0.65%', '−1.20%', '0%'. */
export function signedPct(pct) {
  if (!Number.isFinite(pct)) return null
  if (pct === 0) return '0%'
  const body = Math.abs(pct).toFixed(2)
  return pct < 0 ? `${MINUS}${body}%` : `+${body}%`
}

/** A price for a tab title: no currency sign, two decimals, more under $1. */
export function titlePrice(price) {
  if (!Number.isFinite(price)) return null
  const a = Math.abs(price)
  const decimals = a === 0 || a >= 1 ? 2 : Math.min(6, Math.ceil(-Math.log10(a)) + 1)
  return price.toFixed(decimals)
}

/**
 * chartTitle({ ticker: 'NVDAx', price: 12.34, changePct: 0.65 })
 *   → 'NVDAx 12.34 ▲ +0.65%'
 * chartTitle({ ticker: 'NVDAx', mode: 'gap', gapPct: 0.42 })
 *   → 'NVDAx gap +0.42% ▲'
 * chartTitle({ ticker: 'NVDAx' }) → 'NVDAx'   (no quote yet)
 *
 * The triangle follows the sign of the number shown; a flat reading gets
 * neither. In Gap mode without a gap (a NAV-based token) the title falls
 * back to the price form, and with no price at all to the ticker alone.
 */
export function chartTitle({ ticker, price, changePct, mode = 'candles', gapPct, closed = null } = {}) {
  if (!ticker) return DEFAULT_TITLE
  if (mode === 'gap' && Number.isFinite(gapPct)) {
    return `${ticker} gap ${signedPct(gapPct)}${arrow(gapPct)}${closedSuffix(closed)}`
  }
  const p = titlePrice(price)
  if (p == null) return ticker
  const pct = signedPct(changePct)
  if (pct == null) return `${ticker} ${p}`
  return `${ticker} ${p}${arrow(changePct)} ${pct}`
}

function arrow(n) {
  if (!Number.isFinite(n) || n === 0) return ''
  return ` ${n > 0 ? UP : DOWN}`
}

const SCREEN_NAMES = {
  screener: 'Gaps',
  folders: 'Folders',
  news: 'News',
  trade: 'Trade',
}

/** screenTitle('screener') → 'Gaps · Onstock'; unknown tabs get the default. */
export function screenTitle(tab) {
  const name = SCREEN_NAMES[tab]
  return name ? `${name} · Onstock` : DEFAULT_TITLE
}

/**
 * The Meter's headline for a wrapper: 'NVDAx +1.42% gap', or the ticker
 * alone without a gap; null without a ticker. The tab title and a system
 * notification's title (lib/alertNotify) are both built from it.
 */
export function meterHeadline({ ticker, gapPct } = {}) {
  if (!ticker) return null
  const pct = signedPct(gapPct)
  return pct == null ? ticker : `${ticker} ${pct} gap`
}

/**
 * The Meter's tab title: the headline, then the product. No triangle.
 * `closed` is closedGapLabel's result while the share leg is a close; the
 * title then names that close, as every other gap figure does.
 */
export function meterTitle({ ticker, gapPct, closed = null } = {}) {
  const head = meterHeadline({ ticker, gapPct })
  if (head == null) return boardTitle()
  return `${head}${Number.isFinite(gapPct) ? closedSuffix(closed) : ''} · Onstock`
}

/** ' vs Friday’s close · Market closed', or '' without a closed-market label. */
function closedSuffix(closed) {
  return closed ? ` ${closed.vs} · ${closed.tag}` : ''
}

export function boardTitle() {
  return 'Board · Onstock'
}
