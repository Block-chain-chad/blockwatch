import { usePrices } from '../state/PricesContext'
import { premiumPct, isThinlyTraded } from '../lib/prices'
import { formatPct, formatCompact, changeColor } from '../lib/format'
import { ChevronRight } from './Icons'

/*
 * "Today in tokenized stocks" — the market's daily extremes, computed from
 * data already in memory (liquid assets only; thin tokens would win every
 * category with noise). Each row opens that asset's detail.
 */
export default function DailyDigest({ onOpenAsset }) {
  const { assets } = usePrices()
  const liquid = assets.filter((a) => !isThinlyTraded(a))

  const withPremium = liquid
    .map((a) => ({ asset: a, p: premiumPct(a) }))
    .filter((x) => x.p != null)
  const movers = liquid.filter((a) => a.dayChange != null)
  const traded = liquid.filter((a) => a.volume24h != null)
  if (withPremium.length === 0 || movers.length === 0) return null

  const priciest = withPremium.reduce((m, x) => (x.p > m.p ? x : m))
  const cheapest = withPremium.reduce((m, x) => (x.p < m.p ? x : m))
  const mover = movers.reduce((m, a) => (Math.abs(a.dayChange) > Math.abs(m.dayChange) ? a : m))

  const rows = [
    { label: 'Priciest vs stock', asset: priciest.asset, value: formatPct(priciest.p), cls: changeColor(priciest.p) },
    { label: 'Cheapest vs stock', asset: cheapest.asset, value: formatPct(cheapest.p), cls: changeColor(cheapest.p) },
    { label: 'Biggest 24h move', asset: mover, value: formatPct(mover.dayChange), cls: changeColor(mover.dayChange) },
  ]
  if (traded.length > 0) {
    const vol = traded.reduce((m, a) => (a.volume24h > m.volume24h ? a : m))
    rows.push({ label: 'Most traded', asset: vol, value: formatCompact(vol.volume24h), cls: 'text-zinc-300' })
  }

  return (
    <div className="mx-4 mb-2 mt-1 rounded-2xl bg-zinc-900 pb-1 pt-3">
      <h3 className="px-4 text-sm font-semibold">Today in tokenized stocks</h3>
      <div className="mt-1">
        {rows.map((r) => (
          <button
            key={r.label}
            onClick={() => onOpenAsset(r.asset)}
            className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors active:bg-zinc-800/60"
          >
            <span className="flex-1 text-xs text-zinc-500">{r.label}</span>
            <span className="text-[13px] font-semibold">{r.asset.ticker}</span>
            <span className={`w-16 text-right text-[13px] font-medium tabular-nums ${r.cls}`}>
              {r.value}
            </span>
            <ChevronRight size={14} className="text-zinc-600" />
          </button>
        ))}
      </div>
    </div>
  )
}
