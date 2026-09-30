import { useAlerts } from '../state/AlertsContext'
import { TABS } from '../lib/tabs'

// The five destinations live in lib/tabs.js and are re-exported here so the
// desktop nav rail can import them from the bar it mirrors.
export { TABS }

export default function TabBar({ tab, onChange }) {
  const { unread } = useAlerts()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-zinc-950 pb-[env(safe-area-inset-bottom)]"
      style={{ borderColor: 'var(--border-default)' }}
    >
      {/* Items track the shell, so on desktop they sit under the table's own
          left edge instead of clustering in a phone-width block mid-window.
          Backdrop blur removed with the rest of the glass. */}
      <div className="mx-auto flex max-w-md lg:max-w-[var(--content-max)] lg:justify-start lg:gap-2 lg:px-2">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors lg:max-w-28 lg:flex-row lg:justify-center lg:gap-2 lg:py-2 ${
                active ? 'text-accent' : 'text-zinc-500 active:text-zinc-300'
              }`}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.1 : 1.8} />
                {id === 'news' && unread && (
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-accent" />
                )}
              </span>
              <span className="text-[10px] font-medium lg:text-[13px]">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
