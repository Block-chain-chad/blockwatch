import { useAlerts } from '../../state/AlertsContext'
import { TABS } from '../TabBar'

/*
 * The phone tab bar turned on its side: the same five destinations, icon over
 * a 10px label, down the left edge at 64px (spec §6.7). The News unread dot
 * is the TabBar's, copied so the two never drift.
 * A normal tab stop; no custom keys.
 */
export default function NavRail({ tab, onTab, hidden }) {
  const { unread } = useAlerts()
  return (
    <nav
      aria-label="Sections"
      hidden={hidden}
      className="flex flex-col border-r"
      style={{ width: 'var(--rail-w)', borderColor: 'var(--border-subtle)', gridColumn: 1 }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id
        return (
          <button
            key={id}
            onClick={() => onTab(id)}
            aria-current={active ? 'page' : undefined}
            title={label}
            className={`relative flex h-14 w-full flex-col items-center justify-center gap-0.5 transition-colors ${
              active ? 'text-accent' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="relative">
              <Icon size={22} strokeWidth={active ? 2.1 : 1.8} />
              {id === 'news' && unread && (
                <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-accent" />
              )}
            </span>
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
