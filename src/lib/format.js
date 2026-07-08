export function formatPrice(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatPct(n, { sign = true } = {}) {
  const s = sign && n > 0 ? '+' : ''
  return `${s}${n.toFixed(2)}%`
}

export function changeColor(n) {
  if (n > 0) return 'text-gain'
  if (n < 0) return 'text-loss'
  return 'text-zinc-400'
}

/* Compact dollar figures for big stats: $714.2M, $1.3B. */
export function formatCompact(n) {
  return '$' + Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function timeAgo(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
