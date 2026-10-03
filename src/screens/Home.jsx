import { useCallback, useEffect, useState } from 'react'
import Header from '../components/Header'
import UpdatedAgo from '../components/UpdatedAgo'
import InstallPrompt from '../components/InstallPrompt'
import TreasuryYields from '../components/TreasuryYields'
import LearnCards, { LearnSheet } from '../components/LearnCards'
import { useAnySheetOpen } from '../hooks/useAnySheetOpen'
import { track } from '../services/analytics'
import { TIP_COPY, tipAnchors, currentTip, readSeen, writeSeen } from '../lib/tips'
import { usePrices, useAssetSubscription } from '../state/PricesContext'
import { useFolders } from '../state/FoldersContext'
import { useSparklines } from '../hooks/useSparklines'
import { premiumPct, isThinlyTraded } from '../lib/prices'
import { SESSION_DOT, SESSION_NOTE, closedGapLabelFor } from '../lib/sessionCopy'
import ClosedGapMark from '../components/ClosedGapMark'
import {
  AssetRow,
  AssetTableHeader,
  AssetTableRow,
  FilterChips,
  filterAssets,
  SearchBar,
  Disclaimer,
  formatPct,
  changeColor,
} from '../components/shared'

/*
 * Session strip: says which of the four US sessions we are in and, crucially,
 * whether the gap can be trusted right now. The four-state copy itself lives
 * in lib/sessionCopy.js (the desktop top bar shows the same states as a dot
 * and a short word); the reasoning for four states rather than two is there.
 */
function SessionLine({ onOpenAsset }) {
  const { assets, session } = usePrices()

  // A rule with a state dot, not a card. This was an indigo gradient panel
  // with a moon glyph — the heaviest object above the list, and a gradient
  // surface besides, which the system bans. The session is a fact about the
  // data, so it reads as a caption on the list rather than an announcement.
  const dot = (
    <span
      className="mt-[5px] size-1.5 shrink-0 rounded-full"
      style={{ background: SESSION_DOT[session] }}
    />
  )

  if (session === 'regular') {
    return (
      <div
        className="mx-4 mt-3.5 flex items-start gap-2 border-b pb-2.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {dot}
        <span className="t-caption text-zinc-400">{SESSION_NOTE.regular}</span>
      </div>
    )
  }

  // Sanity band: no real tokenized stock drifts 20% overnight — bigger gaps
  // are stale prints on illiquid tokens, not a story worth telling.
  //
  // In pre/post the bound tightens to 5%, because a third source of big
  // numbers appears: the stock itself moving while our quote sits at the
  // close. We cannot tell that apart from a genuine premium, and naming a
  // "widest gap" is a claim. The raw figure still shows on the asset's own
  // row, where it is data rather than an assertion.
  const bound = session === 'closed' ? 20 : 5
  const candidates = assets
    .filter((a) => !isThinlyTraded(a))
    .map((a) => ({ asset: a, p: premiumPct(a) }))
    .filter((x) => x.p != null && Math.abs(x.p) >= 0.15 && Math.abs(x.p) <= bound)
  const top = candidates.length
    ? candidates.reduce((m, x) => (Math.abs(x.p) > Math.abs(m.p) ? x : m))
    : null

  return (
    <div
      className="mx-4 mt-3.5 flex items-start gap-2 border-b pb-2.5"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {dot}
      <span className="t-caption flex-1 text-zinc-400">{SESSION_NOTE[session]}</span>
      {top && (
        <button onClick={() => onOpenAsset(top.asset)} className="t-caption flex shrink-0 flex-col items-end gap-1 text-right">
          <span>
            <span className="text-zinc-500">Widest gap </span>
            <span className="font-medium text-zinc-300">{top.asset.ticker}</span>{' '}
            <span className={`num font-medium ${changeColor(top.p)}`}>{formatPct(top.p)}</span>
          </span>
          <ClosedGapMark label={closedGapLabelFor(top.asset)} />
        </button>
      )}
    </div>
  )
}

const deviceStorage = () => localStorage

/*
 * Home's tip bubbles (rules in lib/tips.js): which one shows, on which row,
 * and what closing it does. One at a time, each shown once, only when its
 * subject is on screen. They replace the inline caption that sat under the
 * column header, so the first price row no longer moves on a first run.
 *
 * `covered` is true while App has a full-screen overlay over Home (search,
 * an asset); sheets are seen through useAnySheetOpen. Either hides the
 * bubble, and it comes back when they close if it is still due.
 *
 * Returns the row's tip props for one asset id, or null, and the open lesson.
 */
function useHomeTip(visible, covered) {
  const { status } = usePrices()
  const sheetOpen = useAnySheetOpen()
  const [seen, setSeen] = useState(() => readSeen(deviceStorage))
  const [lesson, setLesson] = useState(null)
  const now = Date.now()
  const current = currentTip({ seen, status, covered: covered || sheetOpen, anchors: tipAnchors(visible, now) })
  const kind = current?.tip ?? null

  const close = useCallback(
    (how) => {
      writeSeen(deviceStorage, kind)
      setSeen((s) => ({ ...s, [kind]: true }))
      // Only these two values: with how 'row', never the ticker or the row.
      track('tip_closed', { tip: kind, how })
    },
    [kind],
  )

  // Escape on a keyboard closes it. A sheet's own Escape never reaches
  // here: no bubble shows while a sheet is open.
  useEffect(() => {
    if (!kind) return
    function onKeyDown(e) {
      if (e.key === 'Escape' && !e.repeat && !e.defaultPrevented && !e.isComposing) close('escape')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [kind, close])

  let tip = null
  if (current) {
    const copy = TIP_COPY[kind]
    // The closed bubble is the pill explained: its own tag and its title,
    // the same sentence the desktop hover shows.
    const label = kind === 'closed' ? closedGapLabelFor(visible.find((a) => a.id === current.assetId), now) : null
    tip = {
      kind,
      title: label ? label.tag : copy.title,
      body: label ? label.title : copy.body,
      link: copy.link,
      onLink: () => {
        setLesson(copy.lesson)
        track('learn_open', { source: 'tip', lesson: copy.lesson })
      },
      onClose: close,
    }
  }

  return {
    tipFor: (id) => (current?.assetId === id ? tip : null),
    lessonSheet: lesson && <LearnSheet id={lesson} onClose={() => setLesson(null)} />,
  }
}

export default function Home({ onOpenProfile, onOpenAsset, onOpenSearch, covered = false }) {
  const [filter, setFilter] = useState('all')
  const { assets, marketOpen } = usePrices()
  const { watchlistIds } = useFolders()

  // Watchlist rows need stock quotes for their premium pills — quotes only
  // flow for subscribed assets.
  useAssetSubscription('home-watchlist', watchlistIds)
  const sparks = useSparklines(watchlistIds)

  // Home is YOUR watchlist, not the whole universe — the directory lives
  // behind search.
  const watched = assets.filter((a) => watchlistIds.includes(a.id))
  const visible = filterAssets(watched, filter)
  const { tipFor, lessonSheet } = useHomeTip(visible, covered)

  return (
    <div className="pb-24">
      <Header brand onOpenProfile={onOpenProfile} />

      <SearchBar onOpen={onOpenSearch} />

      {/* The overnight strip is the one thing above the list, because it is the
          only story this app can tell that a stock tracker cannot: the token
          kept trading while the market slept. Everything else that used to sit
          here — the market-cap hero, the Watching/Avg-premium cards, the
          permanent explainer — pushed the first price 536px down an 844px
          screen. None of them drove a decision. */}
      <SessionLine onOpenAsset={onOpenAsset} />

      <FilterChips value={filter} onChange={setFilter} />

      {/* Only under Bonds. The tokenized bond products are wrappers around
          these yields, so the curve is the context that makes those three rows
          mean something — and two of them have no underlying, so they cannot
          show a gap and the filter otherwise reads as broken. Above the column
          header because it is a different table, not part of the asset list. */}
      {filter === 'bond' && <TreasuryYields />}

      {/* Column labels, printed once, replacing the per-row STOCK/TOKEN pairs
          and the dismissible card that used to explain the badge. */}
      <div
        className="mt-2 flex items-baseline justify-between border-b px-4 pb-1.5 lg:hidden"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span className="t-micro text-zinc-500">Asset</span>
        <span className="t-micro text-zinc-500">Gap · token / stock</span>
      </div>

      <div className="lg:hidden">
        {visible.map((a) => (
          <AssetRow
            key={a.id}
            asset={a}
            onOpen={onOpenAsset}
            spark={sparks[a.id]}
            marketOpen={marketOpen}
            tip={tipFor(a.id)}
          />
        ))}
      </div>

      <div className="hidden lg:block">
        {visible.length > 0 && <AssetTableHeader />}
        {visible.map((a) => (
          <AssetTableRow
            key={a.id}
            asset={a}
            onOpen={onOpenAsset}
            spark={sparks[a.id]}
            marketOpen={marketOpen}
            tip={tipFor(a.id)}
          />
        ))}
      </div>

      {visible.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">
            {watched.length === 0
              ? 'Your watchlist is empty. Add the tokens you care about.'
              : 'Nothing on your watchlist in this category yet.'}
          </p>
          <button
            onClick={onOpenSearch}
            className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-zinc-950 active:bg-accent-dim"
          >
            Search assets
          </button>
        </div>
      )}

      <UpdatedAgo className="px-4 pt-3 text-center" />

      {/* Below the list, never above it: nothing may push the first price row
          down (see the note on SessionLine above). Renders only for Safari on
          iOS in a normal tab; see lib/installPrompt.js. */}
      <InstallPrompt />

      {/* Also below the list, for the same reason. This is here so someone who
          meets "gap", "1:1" or "basis point" on a row can look it up without
          first finding the News tab, where the same list also lives. */}
      <LearnCards source="home" />

      <Disclaimer />

      {lessonSheet}
    </div>
  )
}
