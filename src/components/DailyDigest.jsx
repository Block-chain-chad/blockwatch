import { usePrices } from '../state/PricesContext'
import { premiumPct, isThinlyTraded } from '../lib/prices'
import { formatPct, formatCompact, changeColor, isPlausiblePct } from '../lib/format'
import { ChevronRight } from './Icons'
import AssetLogo from './AssetLogo'

/*
 * "Today in tokenized stocks" — the market's daily extremes, computed from
 * data already in memory. Each row opens that asset's detail.
 *
 * Superlatives are gated twice: thin markets are excluded (their gaps are one
 * stale print), and so are implausible magnitudes. Volume alone was not
 * enough — WMKT clears the liquidity bar and still printed a −50.50% daily
 * move straight into the headline slot, in the same confident voice as
 * everything else. A superlative is a claim; the raw figure still shows on the
 * asset's own row, where it is data rather than an assertion.
 */
export default function DailyDigest({ onOpenAsset }) {
  const { assets, session } = usePrices()
  const liquid = assets.filter((a) => !isThinlyTraded(a))

  /*
   * Third gate, on top of liquidity and plausibility: the session.
   *
   * In pre/post the share is trading and our quote is not (Finnhub /quote is
   * regular-session only), so a stock that jumps on earnings renders here as a
   * token premium that does not exist. We cannot separate that from a real
   * gap, and a superlative is a claim — so the bound tightens from 20% to 5%
   * in those windows, which drops the phantom spikes without pretending the
   * ordinary gaps are suspect. The raw figure still shows on the asset's own
   * row, where it is data rather than an assertion. See lib/market.js.
   */
  const bound = session === 'pre' || session === 'post' ? 5 : 20

  const withPremium = liquid
    .map((a) => ({ asset: a, p: premiumPct(a) }))
    .filter((x) => isPlausiblePct(x.p, bound))
  const traded = liquid.filter((a) => a.volume24h != null)
  if (withPremium.length === 0) return null

  const priciest = withPremium.reduce((m, x) => (x.p > m.p ? x : m))
  const cheapest = withPremium.reduce((m, x) => (x.p < m.p ? x : m))

  /*
   * "Biggest 24h move" is gone, and not because of a bad number.
   *
   * It measured the TOKEN's own 24h change, which on a lightly traded wrapper
   * is mostly its own noise rather than anything that happened to the company
   * — so it kept promoting junk one asset class down as each magnitude bound
   * was tightened (WMKT at −50.50%, DSPY at −20.80%, SK Hynix at exactly
   * −12.00%). Capping the magnitude only moves where the junk comes from.
   *
   * It was also the one row that had nothing to do with the gap. This replaces
   * it with a figure that is about the gap, that this app is uniquely able to
   * compute, and that cannot be noise: how far apart two issuers of the SAME
   * company are priced right now. Identical exposure, different wrapper — if
   * they disagree, one of them is mispriced by definition.
   */
  const byUnderlying = new Map()
  for (const x of withPremium) {
    if (!x.asset.underlying) continue
    const arr = byUnderlying.get(x.asset.underlying) ?? []
    arr.push(x)
    byUnderlying.set(x.asset.underlying, arr)
  }
  let spread = null
  for (const members of byUnderlying.values()) {
    if (members.length < 2) continue
    const hi = members.reduce((m, x) => (x.p > m.p ? x : m))
    const lo = members.reduce((m, x) => (x.p < m.p ? x : m))
    const bp = Math.round((hi.p - lo.p) * 100)
    if (!spread || bp > spread.bp) spread = { bp, hi, lo }
  }

  const rows = [
    { label: 'Priciest vs stock', asset: priciest.asset, value: formatPct(priciest.p), cls: changeColor(priciest.p) },
    { label: 'Cheapest vs stock', asset: cheapest.asset, value: formatPct(cheapest.p), cls: changeColor(cheapest.p) },
  ]
  if (spread) {
    rows.push({
      label: 'Widest issuer gap',
      asset: spread.lo.asset,
      value: `${spread.bp}bp`,
      cls: 'text-zinc-300',
    })
  }
  if (traded.length > 0) {
    const vol = traded.reduce((m, a) => (a.volume24h > m.volume24h ? a : m))
    rows.push({ label: 'Most traded', asset: vol, value: formatCompact(vol.volume24h), cls: 'text-zinc-300' })
  }

  // The digest is the lead content of this screen, so it reads as a section of
  // the page rather than a card floating on it — same hairline-and-header
  // treatment as every other list in the app. The logo makes each row
  // recognisable at a glance, which a bare ticker does not.
  return (
    <>
      <h3
        className="t-micro border-b px-4 pb-1.5 pt-1 text-zinc-500"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        Today in tokenized stocks
      </h3>
      <div>
        {rows.map((r) => (
          <button
            key={r.label}
            onClick={() => onOpenAsset(r.asset)}
            className="hover-row flex w-full items-center gap-3 border-b px-4 py-2.5 text-left transition-colors active:bg-zinc-900"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span className="t-caption flex-1 text-zinc-500">{r.label}</span>
            <AssetLogo asset={r.asset} size={18} />
            <span className="t-label w-20 text-zinc-100">{r.asset.ticker}</span>
            <span className={`num t-label w-20 text-right ${r.cls}`}>{r.value}</span>
            <ChevronRight size={14} className="shrink-0 text-zinc-600" />
          </button>
        ))}
      </div>
    </>
  )
}
