// src/components/desktop/Masthead.jsx
import { usePrices } from '../../state/PricesContext'
import { useAlerts } from '../../state/AlertsContext'
import { SESSION_DOT, SESSION_NOTE, widestCredibleGap, widestGapLabel, closedGapLabelFor } from '../../lib/sessionCopy'
import { formatPct } from '../../lib/format'
import ClosedGapMark from '../ClosedGapMark'
import { AvatarButton, Wordmark } from '../Header'
import { BellIcon } from '../Icons'
import SymbolSearch from './SymbolSearch'

/*
 * The masthead (spec §3.2 region A), 56 px: the wordmark, five words with
 * an underline on the active one, the search field with its Ctrl K hint,
 * the session sentence as visible prose (not a tooltip), the widest
 * credible gap, named during the open session too (spec 2026-09-15 §3.1),
 * the bell, the avatar.
 *
 * Fitting 1024 to 1439 px: the session sentence gives way first (it
 * truncates), the search field stays at 240 px until 1440, the widest gap
 * readout appears from 1280, and its closed-market mark drops the "vs"
 * line below 1440 (the tag stays, the full sentence is its tooltip).
 */
const WORDS = [
  { id: 'home', label: 'Board' },
  { id: 'watching', label: 'Watching' },
  { id: 'folders', label: 'Folders' },
  { id: 'news', label: 'News' },
  ...(import.meta.env.VITE_BUILD_TARGET === 'ios' ? [] : [{ id: 'holdings', label: 'Holdings' }]),
]

export default function Masthead({ active, onTab, searchRef, onSelectAsset, onOpenProfile }) {
  const { assets, session } = usePrices()
  const { unread } = useAlerts()
  const top = widestCredibleGap(assets, session, { includeRegular: true })
  return (
    <header
      className="flex h-14 shrink-0 items-center gap-5 border-b px-6"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <Wordmark />
      <nav aria-label="Sections" className="ml-3 flex shrink-0 items-center gap-5">
        {WORDS.map((w) => {
          const on = active === w.id
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onTab(w.id)}
              aria-current={on ? 'page' : undefined}
              className={`t-label -mb-px flex h-14 items-center border-b-2 ${
                on ? 'text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
              style={on ? { borderColor: 'var(--color-accent)' } : undefined}
            >
              {w.label}
            </button>
          )
        })}
      </nav>
      <SymbolSearch ref={searchRef} onSelectAsset={onSelectAsset} />
      {/* The session sentence is the flexible child: it takes the slack
          between the search and the actions and truncates below ~1400 px
          (the full sentence is in the title). */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: SESSION_DOT[session] }} />
        <span className="t-label min-w-0 truncate font-normal text-zinc-400" title={SESSION_NOTE[session]}>
          {SESSION_NOTE[session]}
        </span>
      </div>
      {top && (
        <button type="button" onClick={() => onSelectAsset(top.asset.id)} className="t-caption hidden shrink-0 items-center gap-2 whitespace-nowrap xl:flex">
          <span>
            <span className="text-zinc-500">{widestGapLabel(session)} · </span>
            <span className="font-medium text-zinc-300">{top.asset.ticker}</span>{' '}
            <span className="num font-medium text-zinc-100">{formatPct(top.p)}</span>
          </span>
          <ClosedGapMark label={closedGapLabelFor(top.asset)} vsClassName="hidden min-[1440px]:inline" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onTab('news')}
        aria-label={unread ? 'News, unread' : 'News'}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200"
      >
        <BellIcon size={18} />
        {unread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />}
      </button>
      <AvatarButton onClick={onOpenProfile} className="shrink-0" />
    </header>
  )
}
