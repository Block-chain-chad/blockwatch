import { HomeIcon, FolderIcon, NewsIcon, TradeIcon } from './Icons'
import { useAlerts } from '../state/AlertsContext'

const TABS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'folders', label: 'Folders', Icon: FolderIcon },
  { id: 'news', label: 'News', Icon: NewsIcon },
  { id: 'trade', label: 'Trade', Icon: TradeIcon, soon: true },
]

export default function TabBar({ tab, onChange }) {
  const { unread } = useAlerts()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800/70 bg-zinc-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ id, label, Icon, soon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-accent' : 'text-zinc-500 active:text-zinc-300'
              }`}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.1 : 1.8} />
                {id === 'news' && unread && (
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-accent" />
                )}
              </span>
              <span className="text-[10px] font-medium">{label}</span>
              {soon && (
                <span className="absolute right-1/2 top-1 translate-x-[26px] rounded-full bg-zinc-800 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide text-zinc-400">
                  soon
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
