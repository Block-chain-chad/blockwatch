import { useRef } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import UpdatedAgo from '../UpdatedAgo'
import StatsSection from '../asset/StatsSection'
import KeyStatistics from '../asset/KeyStatistics'
import AboutSection from '../asset/AboutSection'
import AnalystRatings from '../asset/AnalystRatings'
import EarningsSection from '../asset/EarningsSection'
import DetailsSection from '../asset/DetailsSection'
import AssetNews from '../asset/AssetNews'
import TradesOn from '../asset/TradesOn'
import WhereTokensTrade from '../../overlays/WhereTokensTrade'
import AlsoTokenizedBy from '../asset/AlsoTokenizedBy'
import LearnCards from '../LearnCards'

/*
 * The tabs under the chart (spec A16, §6.9): the symbol page's long tail in
 * the owner's four tabs — Statistics · News · Trades on · Also tokenized by
 * — composed from the same asset/* sections the phone screen stacks. The
 * open tab is remembered (bw.desktop.tab.v1) and does not change when the
 * asset does. The two disclosures render open with a plain heading here;
 * the phone keeps its buttons because it passes onToggle.
 */
/* Key statistics is always open here, so clicking down the Board would look
   up a pool for every row passed on the way. Wait for the selection to sit
   still this long first. */
const POOL_LOOKUP_DELAY_MS = 1000

const CHART_TABS = [
  { id: 'statistics', label: 'Statistics' },
  { id: 'news', label: 'News' },
  { id: 'trades', label: 'Trades on' },
  { id: 'also', label: 'Also tokenized by' },
]
/* The Meter retires "Also tokenized by" (the Board's wrapper sub-rows are
   that comparison) and adds Learn, the question cards, where a reader who
   just met the word "gap" can look it up without leaving the Readout. */
const METER_TABS = [
  { id: 'statistics', label: 'Statistics' },
  { id: 'news', label: 'News' },
  { id: 'trades', label: 'Trades on' },
  { id: 'learn', label: 'Learn' },
]

export default function DetailTabs({
  asset,
  info,
  spread,
  siblings,
  hasTokenStats,
  hasStockStats,
  bothSides,
  onSelectAsset,
  variant = 'chart',
}) {
  const TABS = variant === 'meter' ? METER_TABS : CHART_TABS
  const TAB_IDS = TABS.map((t) => t.id)
  const [saved, setTab] = useLocalState('bw.desktop.tab.v1', 'statistics')
  const tab = TAB_IDS.includes(saved) ? saved : 'statistics'
  const listRef = useRef(null)

  // Arrow keys move between tabs (and select them, the way a native tab
  // strip does); Home/End jump. The active tab is the one tab stop.
  function onKeyDown(e) {
    const i = TAB_IDS.indexOf(tab)
    let next = null
    if (e.key === 'ArrowRight') next = (i + 1) % TAB_IDS.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + TAB_IDS.length) % TAB_IDS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TAB_IDS.length - 1
    if (next == null) return
    e.preventDefault()
    setTab(TAB_IDS[next])
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus()
  }

  return (
    <div className="mt-6">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Asset details"
        onKeyDown={onKeyDown}
        className="flex h-10 items-stretch gap-1 overflow-x-auto border-b [scrollbar-width:none]"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              role="tab"
              id={`desktop-tab-${t.id}`}
              aria-selected={active}
              aria-controls={`desktop-tabpanel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`t-label -mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 transition-colors ${
                active
                  ? 'text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
              style={active ? { borderColor: 'var(--color-accent)' } : undefined}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* The sections carry the phone's px-4 inside them; pulling the panel
          back by the same amount lands their text on the center gutter. */}
      <div
        role="tabpanel"
        id={`desktop-tabpanel-${tab}`}
        aria-labelledby={`desktop-tab-${tab}`}
        className="-mx-4 max-w-[752px] pt-4"
      >
        {tab === 'statistics' && (
          <>
            <StatsSection asset={asset} info={info} />
            <KeyStatistics
              asset={asset}
              info={info}
              spread={spread}
              hasTokenStats={hasTokenStats}
              hasStockStats={hasStockStats}
              bothSides={bothSides}
              open
              poolLookupDelayMs={POOL_LOOKUP_DELAY_MS}
            />
            <AboutSection asset={asset} info={info} />
            <AnalystRatings info={info} />
            <EarningsSection asset={asset} info={info} />
            {info.loading && asset.underlying && (
              <div className="px-4 pt-6">
                <div className="h-24 animate-pulse rounded-2xl bg-zinc-900" />
              </div>
            )}
            <DetailsSection asset={asset} open />
            <UpdatedAgo className="px-4 pt-4" />
          </>
        )}
        {tab === 'news' &&
          (info.news?.length > 0 ? (
            <AssetNews asset={asset} info={info} />
          ) : info.loading && asset.underlying ? (
            <div className="px-4 pt-6">
              <div className="h-24 animate-pulse rounded-2xl bg-zinc-900" />
            </div>
          ) : (
            <p className="t-caption px-4 pt-6 text-zinc-500">
              {asset.underlying
                ? `No recent headlines for ${asset.underlying}.`
                : `No headlines, because ${asset.ticker} tracks no listed company.`}
            </p>
          ))}
        {tab === 'trades' && (
          <>
            <TradesOn asset={asset} />
            <WhereTokensTrade className="px-4 pt-4" />
          </>
        )}
        {tab === 'also' &&
          (siblings.length > 0 ? (
            <AlsoTokenizedBy asset={asset} siblings={siblings} onSwitchAsset={onSelectAsset} />
          ) : (
            <p className="t-caption px-4 pt-6 text-zinc-500">
              {asset.underlying
                ? `Only ${asset.issuer} tokenizes ${asset.underlying} today.`
                : `Only ${asset.issuer} offers ${asset.ticker} today.`}
            </p>
          ))}
        {tab === 'learn' && (
          <div className="-mx-0">
            <LearnCards source="desktop" />
          </div>
        )}
      </div>
    </div>
  )
}
