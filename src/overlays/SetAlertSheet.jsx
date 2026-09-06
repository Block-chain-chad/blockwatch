import { useState } from 'react'
import { useAlerts } from '../state/AlertsContext'
import { premiumPct, isThinlyTraded } from '../lib/prices'
import { formatPct, formatPrice } from '../lib/format'

const THRESHOLDS = [0.5, 1, 2, 5]

/*
 * Two alert types per asset:
 *  - Drift: |premium| crosses ±X% (re-arms when it comes back inside)
 *  - Price target: token crosses $X (one-shot, direction from current price)
 */
export default function SetAlertSheet({ asset, onClose }) {
  const { rules, setDriftAlert, setPriceAlert, removeAlert } = useAlerts()
  const existing = rules[asset.id] ?? {}
  const [tab, setTab] = useState(existing.price && !existing.drift ? 'price' : 'drift')
  const [threshold, setThreshold] = useState(existing.drift?.threshold ?? 1)
  const [target, setTarget] = useState(
    existing.price?.target != null
      ? String(existing.price.target)
      : asset.tokenPrice != null
        ? asset.tokenPrice.toFixed(2)
        : ''
  )
  const p = premiumPct(asset)

  const targetNum = parseFloat(target)
  const targetValid = Number.isFinite(targetNum) && targetNum > 0
  const direction =
    targetValid && asset.tokenPrice != null && targetNum < asset.tokenPrice ? 'below' : 'above'

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 overlay-in bg-black/60" />
      <div className="relative sheet-in w-full rounded-t-3xl bg-zinc-950 p-4 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-800" />
        <h2 className="px-1 text-base font-semibold">Alerts for {asset.ticker}</h2>

        <div className="mt-3 flex rounded-xl bg-zinc-900 p-1">
          {[
            { id: 'drift', label: `Drift vs ${asset.underlying}` },
            { id: 'price', label: 'Price target' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg py-2 text-[13px] font-medium transition-colors ${
                tab === t.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'drift' ? (
          <>
            <p className="mt-3 px-1 text-xs leading-relaxed text-zinc-500">
              Get an in-app alert when {asset.ticker} trades more than the threshold above or
              below {asset.underlying}.
              {p != null && (
                <>
                  {' '}
                  Right now it's at <span className="tabular-nums text-zinc-300">{formatPct(p)}</span>.
                </>
              )}
            </p>
            {isThinlyTraded(asset) && (
              <p className="mt-2 px-1 text-xs text-zinc-500">
                Heads up: {asset.ticker} trades thinly, so its price jumps around on small
                trades — tight thresholds here will fire often.
              </p>
            )}
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
              {existing.drift && (
                <button
                  onClick={() => {
                    removeAlert(asset.id, 'drift')
                    onClose()
                  }}
                  className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-300 transition-colors active:bg-zinc-800"
                >
                  Remove
                </button>
              )}
              <button
                onClick={() => {
                  setDriftAlert(asset.id, threshold)
                  onClose()
                }}
                className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
              >
                {existing.drift ? 'Update drift alert' : 'Set drift alert'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 px-1 text-xs leading-relaxed text-zinc-500">
              One-time alert when {asset.ticker} crosses your price.
              {asset.tokenPrice != null && (
                <>
                  {' '}
                  It's trading at{' '}
                  <span className="tabular-nums text-zinc-300">{formatPrice(asset.tokenPrice)}</span>{' '}
                  now.
                </>
              )}
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-500">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-sm tabular-nums text-zinc-100 placeholder-zinc-500 outline-none"
              />
            </div>
            <p className="mt-2 h-4 px-1 text-xs text-zinc-500">
              {targetValid &&
                asset.tokenPrice != null &&
                `Fires when the token ${direction === 'above' ? 'rises above' : 'falls below'} ${formatPrice(targetNum)}, then removes itself.`}
            </p>
            <div className="mt-3 flex gap-2">
              {existing.price && (
                <button
                  onClick={() => {
                    removeAlert(asset.id, 'price')
                    onClose()
                  }}
                  className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-300 transition-colors active:bg-zinc-800"
                >
                  Remove
                </button>
              )}
              <button
                disabled={!targetValid}
                onClick={() => {
                  setPriceAlert(asset.id, targetNum, direction)
                  onClose()
                }}
                className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
              >
                {existing.price ? 'Update price alert' : 'Set price alert'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
