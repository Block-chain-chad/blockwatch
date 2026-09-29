import { useNow } from '../hooks/useNow'
import { historyProblem } from '../lib/historyStatus'

/*
 * The gap-history pane when no source could draw the token line: what is
 * missing and why, and a retry that stays disabled, counting down, until the
 * source's cooldown ends. `className` sizes it for the pane it replaces.
 */
export default function HistoryProblem({ problem, onRetry, className = '' }) {
  const now = useNow()
  const { text, retry } = historyProblem(problem, now)
  return (
    <div className={`flex flex-col items-start gap-2 ${className}`} role="status">
      <p className="t-caption text-zinc-400">{text}</p>
      {retry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retry.disabled}
          className="t-label h-7 rounded-md px-2.5 text-zinc-300 transition-colors hover:bg-zinc-900 disabled:text-zinc-600 disabled:hover:bg-transparent"
          style={{ boxShadow: 'inset 0 0 0 1px var(--border-default)' }}
        >
          <span className="num">{retry.label}</span>
        </button>
      )}
    </div>
  )
}
