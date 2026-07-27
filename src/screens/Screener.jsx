import { useMemo, useState } from 'react'
import Header from '../components/Header'
import UpdatedAgo from '../components/UpdatedAgo'
import AssetLogo from '../components/AssetLogo'
import PriceText from '../components/PriceText'
import { usePrices, useAssetSubscription } from '../state/PricesContext'
import { premiumPct, isThinlyTraded } from '../lib/prices'
import { formatPct, changeColor, EM_DASH } from '../lib/format'
import { ChevronRight, ChevronDown } from '../components/Icons'
import { Disclaimer, filterAssets, FilterChips, GapBar } from '../components/shared'

/*
 * The screener — "which companies are mispriced right now?"
 *
 * Rows are ONE PER UNDERLYING, not one per token. Ungrouped, the ranking was
 * mostly duplicates: three QQQ rows and three NVDA rows crowded out everything
 * else, because the same company is tokenized by several issuers and their
 * gaps land next to each other. Sorting by gap therefore sorted by "which
 * companies have many issuers", which is not a question anyone asked.
 *
 * Grouping also turns the repetition into the most useful thing here. The same
 * exposure trades at different premiums depending on who issued it — QQQ spans
 * roughly 33 basis points across Ondo, xStocks and bStocks — so a group states
 * its range, and expanding shows which issuer is currently cheapest. rwa.xyz
 * has this data and never derives it; neither does anyone else.
 */

const SORTS = [
  { id: 'widest', label: 'Widest gap', hint: 'Furthest from the share price, either direction' },
  { id: 'premium', label: 'Most expensive', hint: 'Token costs the most vs its share' },
  { id: 'discount', label: 'Cheapest', hint: 'Token costs the least vs its share' },
]

// A screener is a ranking, so it has to be honest about what it ranks. Thin
// markets print wild gaps off one stale trade — leaving them in would put junk
// at the top of every sort, which is exactly how the News digest ended up
// publishing a −50.50% daily move as a headline.
const MAX_CREDIBLE_GAP = 25

export default function Screener({ onOpenProfile, onOpenAsset }) {
  const [sort, setSort] = useState('widest')
  const [filter, setFilter] = useState('all')
  const [openKey, setOpenKey] = useState(null)
  const { assets } = usePrices()

  const groups = useMemo(() => {
    const rows = filterAssets(assets, filter)
      .map((a) => ({ a, p: premiumPct(a) }))
      .filter((r) => r.p != null && Math.abs(r.p) <= MAX_CREDIBLE_GAP && !isThinlyTraded(r.a))

    // Group on the underlying where there is one; NAV-based products have no
    // share to compare against and stand alone.
    const byUnderlying = new Map()
    for (const r of rows) {
      const key = r.a.underlying || `solo:${r.a.id}`
      if (!byUnderlying.has(key)) byUnderlying.set(key, [])
      byUnderlying.get(key).push(r)
    }

    const list = [...byUnderlying.entries()].map(([key, members]) => {
      members.sort((x, y) => y.p - x.p)
      const gaps = members.map((m) => m.p)
      const lo = Math.min(...gaps)
      const hi = Math.max(...gaps)
      // The gap the group is ranked and drawn by depends on the question
      // asked: "widest" wants the most extreme member either way.
      const lead =
        sort === 'discount' ? lo : sort === 'premium' ? hi : Math.abs(hi) >= Math.abs(lo) ? hi : lo
      return {
        key,
        underlying: members[0].a.underlying,
        name: members[0].a.name,
        logoAsset: members[0].a,
        members,
        lo,
        hi,
        lead,
        spreadBp: Math.round((hi - lo) * 100),
      }
    })

    const by = {
      widest: (x, y) => Math.abs(y.lead) - Math.abs(x.lead),
      premium: (x, y) => y.lead - x.lead,
      discount: (x, y) => x.lead - y.lead,
    }[sort]
    return list.sort(by).slice(0, 40)
  }, [assets, filter, sort])

  // Only what's on screen needs stock quotes — the registry drives polling, so
  // ranking hundreds must not subscribe to hundreds.
  useAssetSubscription(
    'screener',
    useMemo(() => groups.flatMap((g) => g.members.map((m) => m.a.id)), [groups])
  )

  const active = SORTS.find((s) => s.id === sort)

  return (
    <div className="pb-24">
      <Header title="Gaps" onOpenProfile={onOpenProfile} />

      <div className="flex gap-2 overflow-x-auto px-4 pt-1 [scrollbar-width:none]">
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={`t-label shrink-0 rounded-md px-3 py-1.5 transition-colors ${
              sort === s.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 active:bg-zinc-900'
            }`}
            style={sort === s.id ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="t-caption px-4 pt-2 text-zinc-500">{active.hint}</p>

      <FilterChips value={filter} onChange={setFilter} />

      <div
        className="mt-2 flex items-baseline justify-between border-b px-4 pb-1.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span className="t-micro text-zinc-500">{groups.length} companies</span>
        <span className="t-micro text-zinc-500">Gap vs share</span>
      </div>

      <div>
        {groups.map((g) => {
          const open = openKey === g.key
          const multi = g.members.length > 1
          return (
            <div key={g.key}>
              <button
                onClick={() =>
                  multi ? setOpenKey(open ? null : g.key) : onOpenAsset(g.members[0].a)
                }
                className="hover-row flex w-full items-center gap-3 border-b px-4 py-2.5 text-left transition-colors active:bg-zinc-900"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <AssetLogo asset={g.logoAsset} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="t-label text-zinc-100">{g.underlying || g.logoAsset.ticker}</div>
                  <div className="t-caption truncate text-zinc-500">
                    {g.name}
                    {multi && (
                      <span className="text-zinc-600">
                        {' · '}
                        {g.members.length} issuers
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <GapBar pct={g.lead} width={88} />
                    <span className={`num t-label ${changeColor(g.lead)}`}>{formatPct(g.lead)}</span>
                  </div>
                  {/* The reason grouping is worth doing: identical exposure,
                      different price, depending on the issuer. */}
                  <div className="t-caption mt-1 text-zinc-500">
                    {multi ? (
                      <>
                        {formatPct(g.lo)} to {formatPct(g.hi)}
                        <span className="text-zinc-600"> · {g.spreadBp}bp apart</span>
                      </>
                    ) : (
                      <span className="text-zinc-600">1 issuer</span>
                    )}
                  </div>
                </div>
                {multi ? (
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                ) : (
                  <ChevronRight size={16} className="shrink-0 text-zinc-600" />
                )}
              </button>

              {open &&
                g.members.map((m, i) => (
                  <button
                    key={m.a.id}
                    onClick={() => onOpenAsset(m.a)}
                    className="hover-row flex w-full items-center gap-3 border-b bg-zinc-900/40 py-2 pl-14 pr-4 text-left transition-colors active:bg-zinc-900"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="t-label text-zinc-100">{m.a.ticker}</span>
                        {/* The cheapest member is the whole reason to open this
                            row, so it sits beside the ticker where it cannot be
                            truncated — inside the issuer line it was competing
                            with the chain name and getting cut to "chea…". */}
                        {i === g.members.length - 1 && g.members.length > 1 && (
                          <span className="t-micro shrink-0 rounded-full bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                            Cheapest
                          </span>
                        )}
                      </div>
                      <div className="t-caption truncate text-zinc-500">
                        {m.a.issuer}
                        {m.a.chain && <span className="text-zinc-600"> · {m.a.chain}</span>}
                      </div>
                    </div>
                    <span className="num t-caption text-right text-zinc-500">
                      <PriceText value={m.a.tokenPrice} />
                      <span className="mx-1 text-zinc-600">/</span>
                      {m.a.stockPrice != null ? <PriceText value={m.a.stockPrice} /> : EM_DASH}
                    </span>
                    <span className={`num t-label w-16 text-right ${changeColor(m.p)}`}>
                      {formatPct(m.p)}
                    </span>
                  </button>
                ))}
            </div>
          )
        })}
      </div>

      {groups.length === 0 && (
        <p className="t-body px-6 py-12 text-center text-zinc-400">
          No gaps to rank yet — prices are still loading.
        </p>
      )}

      <UpdatedAgo className="px-4 pt-3 text-center" />
      <Disclaimer />
    </div>
  )
}
