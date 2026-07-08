import { useState } from 'react'
import { useAlerts } from '../state/AlertsContext'
import { premiumPct } from '../lib/prices'
import { formatPct } from '../lib/format'

const THRESHOLDS = [0.5, 1, 2, 5]

/* Pick a drift threshold: alert when |premium| crosses ±X%. */
export default function SetAlertSheet({ asset, onClose }) {
  const { rules, setAlert, removeAlert } = useAlerts()
  const existing = rules[asset.id]
  const [threshold, setThreshold] = useState(existing?.threshold ?? 1)
  const p = premiumPct(asset)

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full rounded-t-3xl bg-zinc-950 p-4 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-800" />
        <h2 className="px-1 text-base font-semibold">Drift alert</h2>
        <p className="mt-0.5 px-1 text-xs text-zinc-500">
          Get an in-app alert when {asset.ticker} trades more than the threshold above or below{' '}
          {asset.underlying}.
          {p != null && (
            <>
              {' '}
              Right now it's at <span className="tabular-nums text-zinc-300">{formatPct(p)}</span>.
            </>
          )}
        </p>

        <div className="mt-4 flex gap-2 px-1">
          {THRESHOLDS.map((t) => (
            <button
              key={t}
              onClick={() => setThreshold(t)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium tabular-nums transition-colors ${
                threshold === t
                  ? 'bg-accent text-zinc-950'
                  : 'bg-zinc-900 text-zinc-400 active:bg-zinc-800'
              }`}
            >
              ±{t}%
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          {existing && (
            <button
              onClick={() => {
                removeAlert(asset.id)
                onClose()
              }}
              className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-300 transition-colors active:bg-zinc-800"
            >
              Remove alert
            </button>
          )}
          <button
            onClick={() => {
              setAlert(asset.id, threshold)
              onClose()
            }}
            className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
          >
            {existing ? 'Update alert' : 'Set alert'}
          </button>
        </div>
      </div>
    </div>
  )
}
