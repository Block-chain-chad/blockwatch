import { useState } from 'react'
import { useAlerts } from '../state/AlertsContext'
import { premiumPct, isThinlyTraded } from '../lib/prices'
import { formatPct, formatPrice } from '../lib/format'
import Sheet, { SheetTitle } from '../components/Sheet'
import { useLocalState } from '../hooks/useLocalState'
import { NOTIFY_KEY, NOTIFY_OFFER_COPY, notifyOfferVisible } from '../lib/alertNotify'
import { requestNotificationPermission } from '../services/notifications'
import { driftWindowNote } from '../lib/alertRules'
import { closedGapLabelFor } from '../lib/sessionCopy'
import ClosedGapMark from '../components/ClosedGapMark'

const THRESHOLDS = [0.5, 1, 2, 5]

/*
 * Two alert types per asset:
 *  - Drift: |premium| crosses ±X% (re-arms when it comes back inside)
 *  - Price target: token crosses $X (one-shot, direction from current price)
 */
export default function SetAlertSheet({ asset, onClose, notify = false }) {
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
  const closed = p != null ? closedGapLabelFor(asset) : null

  const targetNum = parseFloat(target)
  const targetValid = Number.isFinite(targetNum) && targetNum > 0
  const direction =
    targetValid && asset.tokenPrice != null && targetNum < asset.tokenPrice ? 'below' : 'above'

  return (
    <Sheet onClose={onClose}>
      <SheetTitle className="px-1 text-base font-semibold">Alerts for {asset.ticker}</SheetTitle>

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
                Right now it's at <span className="tabular-nums text-zinc-300">{formatPct(p)}</span>
                {closed ? ` ${closed.vs}. ` : '. '}
                <ClosedGapMark label={closed} />
              </>
            )}
          </p>
          {/*
            A gated alert that stays silent is indistinguishable from a broken
            one, so the sheet says the rule up front rather than leaving
            someone to wonder why an 8pm gap never reached them.
          */}
          <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-500">
            {driftWindowNote(asset.underlying)}
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
          {notify && <NotifyOffer />}
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
          {notify && <NotifyOffer />}
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
    </Sheet>
  )
}

/*
 * The one-time ask for system notifications (spec 2026-09-15 §4.1), desktop
 * only: rendered when the Meter passes `notify`, and then only while the
 * browser has not been asked and this app has not been told no. Granted is
 * remembered as 'on', denied or dismissed as 'declined', in
 * bw.meter.notify.v1. Saving the alert never waits on the answer. A child
 * component so the phone sheet (notify absent) never touches the key.
 */
function NotifyOffer() {
  const [saved, setSaved] = useLocalState(NOTIFY_KEY, null)
  const permission = typeof Notification === 'undefined' ? null : Notification.permission
  if (!notifyOfferVisible({ permission, saved })) return null
  return (
    <div className="mt-4 flex items-center gap-3 px-1">
      <p className="flex-1 text-xs leading-relaxed text-zinc-500">
        {NOTIFY_OFFER_COPY}
      </p>
      <button
        type="button"
        onClick={() => {
          // services/notifications.js owns the ask, the browser quirks and
          // the one analytics event that comes out of it.
          requestNotificationPermission()
            .then((outcome) => {
              const answer = outcome === 'granted' ? 'on' : 'declined'
              // The sheet may have closed before the browser bubble was
              // answered: write the answer straight to storage so it survives
              // this component unmounting, then mirror it into state for a
              // sheet that is still open.
              try {
                localStorage.setItem(NOTIFY_KEY, JSON.stringify(answer))
              } catch {
                // storage unavailable: the in-memory answer still stands for this sheet
              }
              setSaved(answer)
            })
            .catch(() => {
              // The browser refused to ask (no user gesture, or an unsupported
              // call shape): leave the answer unrecorded so the offer can be
              // made again next time.
            })
        }}
        className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-800 active:bg-zinc-800"
      >
        Turn on
      </button>
    </div>
  )
}
