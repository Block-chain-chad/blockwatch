import { useEffect, useRef, useState } from 'react'
import { useWallet } from '../state/WalletContext'
import { getSwapQuote, executeSwap, toRaw, fromRaw, USDC_DECIMALS } from '../services/swap'

/*
 * Non-custodial swap sheet. Buy (spend USDC) or sell (spend token); a live
 * quote refreshes as you type and every few seconds, showing the guaranteed
 * minimum received and the route's price impact. Confirming hands an unsigned
 * transaction to the wallet — the user signs and sends inside Phantom, funds
 * never touch BlockWatch. No platform fee is applied anywhere.
 */

// Price impact is the silent way to lose money on a thin token: warn loudly
// from 2%, and above 5% require an explicit acknowledgment naming the number.
// No hard ceiling — it stays the user's call, they just can't miss it.
const IMPACT_WARN_PCT = 2
const IMPACT_ACK_PCT = 5
// How much worse a refreshed quote may get before the acknowledgment has to
// be given again. The point is to stop an ack carrying into a MATERIALLY
// different trade — not to untick the box every 8 seconds while someone reads
// the warning. Half a percentage point.
const ACK_TOLERANCE_PCT = 0.5
// Solana mints are 0-9 decimals; the ceiling is slack, not a spec. Anything
// outside this from the price API is unusable — feeding it to BigInt scaling
// throws RangeError, and a throw in a render effect takes down the whole app.
const MAX_DECIMALS = 18
// How often a resting quote re-quotes. Note this is SHORTER than the quote
// request timeout in services/swap.js — see the in-flight guard in the quote
// effect, which is what keeps the two from fighting.
const QUOTE_REFRESH_MS = 8000

// Small receipts (0.00003 of a pricey token) must not display as bare "0".
function fmtAmount(n) {
  if (n == null) return null
  if (n === 0) return '0'
  if (Math.abs(n) < 0.0001) return n.toPrecision(2)
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

export default function SwapSheet({ asset, onClose }) {
  const { publicKey, provider } = useWallet()
  const [side, setSide] = useState('buy')
  const [amount, setAmount] = useState('')
  const [decimals, setDecimals] = useState(null)
  const [quote, setQuote] = useState(null)
  const [quoting, setQuoting] = useState(false)
  // Action lifecycle, kept OUT of the quote effect's deps (mutating a dep it
  // reads caused an infinite refetch loop). A ref mirrors it so the quote
  // loop can pause during/after signing without depending on the value.
  // idle | signing | done | failed | unknown | rejected
  //   failed  = threw BEFORE the wallet ever saw it — nothing was sent.
  //   unknown = may be on-chain; never claim it failed.
  const [status, setStatus] = useState('idle')
  const statusRef = useRef('idle')
  const [message, setMessage] = useState(null)
  const [sig, setSig] = useState(null)
  // The price impact the user explicitly acknowledged ("I understand I may
  // lose ~X%"), or null for none. Storing the NUMBER rather than a boolean is
  // what lets a refreshed quote keep the acknowledgment when the trade hasn't
  // materially changed, while a genuinely worse quote demands a fresh one.
  const [ackedImpact, setAckedImpact] = useState(null)
  // True when this token's details (decimals) could not be loaded at all —
  // bad value from the price API, or the request simply failed. Without this
  // the sheet renders three em-dashes and a dead button with no explanation.
  const [decimalsFailed, setDecimalsFailed] = useState(false)
  const reqRef = useRef(0)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  // Token decimals (needed to size a sell) from Jupiter's price API.
  useEffect(() => {
    let cancelled = false
    setDecimalsFailed(false)
    fetch(`https://lite-api.jup.ag/price/v3?ids=${asset.mint}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        // Upstream value, therefore untrusted: -1, 6.5, NaN and 'abc' all make
        // BigInt scaling throw, and this feeds a render effect. A numeric
        // STRING ("6") is legitimate data though, so coerce first and validate
        // the number — don't reject real data on a type technicality.
        const raw = j?.[asset.mint]?.decimals
        const n =
          typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '')
            ? Number(raw)
            : NaN
        const valid = Number.isSafeInteger(n) && n >= 0 && n <= MAX_DECIMALS
        setDecimals(valid ? n : null)
        setDecimalsFailed(!valid)
      })
      .catch(() => {
        // Always reachable (offline, DNS, Jupiter down) and previously silent.
        if (!cancelled) setDecimalsFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [asset.mint])

  // Live quote: re-quotes on amount/side change and every 8s so a resting
  // quote can't go stale. Does NOT depend on `status`; pauses via statusRef
  // once the user starts signing or the swap is terminal.
  useEffect(() => {
    const amt = Number(amount)
    setQuote(null)
    setMessage(null)
    // A different amount or side is a different trade — any acknowledgment
    // made against the old numbers is void.
    setAckedImpact(null)
    if (!(amt > 0) || !Number.isFinite(amt) || decimals == null) return
    const inputDecimals = side === 'buy' ? USDC_DECIMALS : decimals
    // Scale from the raw STRING, not the coerced number: toRaw does BigInt
    // string math (and expands "1e5" itself), so 20-digit inputs can't
    // silently mis-size the transaction the way a float round-trip would.
    let amountRaw
    try {
      amountRaw = toRaw(amount, inputDecimals)
    } catch {
      // Never let a throw escape this effect: it would propagate to the
      // top-level ErrorBoundary and replace the whole app mid-swap. Degrade
      // to the same inline message a bad quote gets.
      setQuoting(false)
      setMessage('No route for that size — try a different amount.')
      return
    }
    if (amountRaw === '0') {
      // Below one atomic unit of this mint — a quote request here is
      // guaranteed to fail, so don't fire one.
      setQuoting(false)
      setMessage('Amount is too small to swap.')
      return
    }
    let alive = true
    // One quote request in flight at a time. Without this the 8s refresh
    // supersedes the previous attempt before its 12s timeout can fire, so a
    // hung feed produces an endless chain of requests that are each discarded
    // by the seq guard below — "Quoting…" sticks forever and nothing ever
    // reports the failure. It also stops requests piling up against Jupiter.
    let inFlight = false
    const run = async () => {
      if (statusRef.current === 'signing' || statusRef.current === 'done') return
      if (inFlight) return
      inFlight = true
      const seq = ++reqRef.current
      setQuoting(true)
      try {
        const q = await getSwapQuote({ side, mint: asset.mint, amountRaw })
        if (!alive || seq !== reqRef.current) return
        setQuote(q)
        // NOTE: the acknowledgment is deliberately NOT cleared here. Same
        // amount, same side, same asset = the same trade, and unticking the
        // box every 8s just left the Confirm button permanently dead. The
        // gate below re-requires it if the impact got materially worse.
        setMessage(null)
      } catch (err) {
        if (!alive || seq !== reqRef.current) return
        // Drop the stale quote rather than leaving an old number on screen
        // next to a live Confirm button.
        setQuote(null)
        setMessage(
          err?.code === 'timeout'
            ? "Couldn't reach the price feed — trying again in a moment."
            : 'No route for that size — try a different amount.'
        )
      } finally {
        inFlight = false
        // Always clears, on every path including an aborted request, so
        // "Quoting…" can never stick.
        if (alive && seq === reqRef.current) setQuoting(false)
      }
    }
    run()
    const t = setInterval(run, QUOTE_REFRESH_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [amount, side, decimals, asset.mint])

  const outDecimals = side === 'buy' ? decimals : USDC_DECIMALS
  const received = quote ? fromRaw(quote.outAmount, outDecimals) : null
  const minReceived = quote ? fromRaw(quote.otherAmountThreshold, outDecimals) : null
  // Jupiter may omit priceImpactPct entirely, or send something that doesn't
  // parse. Both collapse to null here — via Number.isFinite, so NaN and
  // Infinity land in the same place instead of sneaking past a `>= 5` test
  // (NaN >= 5 is false) and printing "NaN%" next to the money.
  const impactRaw = quote?.priceImpactPct != null ? Number(quote.priceImpactPct) * 100 : null
  const impact = Number.isFinite(impactRaw) ? impactRaw : null
  // Unknown is its own state, and only meaningful once a quote exists: we have
  // a route but no impact estimate for it. It gets a warning banner, but does
  // NOT block — the user can still confirm (see the banner copy).
  const impactUnknown = quote != null && impact == null
  const impactWarn = impact != null && impact >= IMPACT_WARN_PCT && impact < IMPACT_ACK_PCT
  const impactNeedsAck = impact != null && impact >= IMPACT_ACK_PCT
  // The acknowledgment covers the current quote only while the impact is at
  // or below what was actually acknowledged (plus a small tolerance for
  // ordinary quote jitter). A quote that gets materially worse — or one that
  // climbs past 5% when nothing was ever acknowledged — re-blocks Confirm and
  // shows the box unticked. So a ≥5% trade can never be confirmed at an
  // impact the user has not acknowledged at or above its current level.
  const ackCovers =
    ackedImpact != null && impact != null && impact <= ackedImpact + ACK_TOLERANCE_PCT
  const blockedByImpact = impactNeedsAck && !ackCovers

  async function confirm() {
    if (!quote || status === 'signing' || blockedByImpact) return
    setStatus('signing')
    setMessage(null)
    try {
      const signature = await executeSwap({ quote, provider })
      setSig(signature)
      setStatus('done')
    } catch (err) {
      const m = String(err?.message ?? '').toLowerCase()
      const soundsCancelled = m.includes('reject') || m.includes('declined')
      // The phase tag from services/swap.js is authoritative; the message
      // text is only a heuristic and MUST NOT override it. Solana and relay
      // errors thrown AFTER broadcast routinely say "rejected" ("Transaction
      // rejected by the leader", Phantom's -32003 "Transaction Rejected") —
      // calling those "nothing was sent" is exactly the double-swap trap this
      // screen exists to prevent. Only code 4001 is a trustworthy
      // user-cancelled signal on its own.
      if (err?.code === 4001 || (soundsCancelled && err?.phase !== 'broadcast')) {
        // The wallet refused to sign. Nothing was broadcast.
        setStatus('rejected')
        setMessage('Cancelled in your wallet — nothing was sent.')
      } else if (err?.phase === 'build') {
        // Threw before the wallet was ever handed the transaction (see
        // services/swap.js): we can promise nothing left the wallet.
        setStatus('failed')
        setMessage(null)
      } else {
        // Anything else — including an untagged error — is treated as
        // possibly-broadcast. signAndSend broadcasts before it can time out,
        // so we must NOT claim it failed: that invites a double swap.
        setStatus('unknown')
        setMessage(null)
      }
    }
  }

  const unitLabel = side === 'buy' ? 'USDC' : asset.ticker
  const outLabel = side === 'buy' ? asset.ticker : 'USDC'

  return (
    <div className="fixed inset-0 z-[55] mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 overlay-in bg-black/60" />
      <div className="relative sheet-in w-full rounded-t-3xl bg-zinc-950 p-4 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-800" />

        {status === 'done' ? (
          <div className="px-1 pb-2 text-center">
            <h2 className="text-lg font-semibold">Swap submitted</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Your {side === 'buy' ? `${asset.ticker} purchase` : `sale of ${asset.ticker}`} was
              sent to the Solana network. Submitted isn't the same as confirmed — your wallet is
              the one that knows. It usually confirms in a few seconds, Phantom will notify you,
              and you can watch it here:
            </p>
            <a
              href={`https://solscan.io/tx/${sig}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-accent"
            >
              View transaction ↗
            </a>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-200 active:bg-zinc-800"
            >
              Done
            </button>
          </div>
        ) : status === 'failed' ? (
          <div className="px-1 pb-2 text-center">
            <h2 className="text-lg font-semibold">Couldn’t build this swap</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Nothing was sent and nothing left your wallet — safe to try again.
            </p>
            <button
              onClick={() => {
                // Back to the form with amount and side intact — no retyping.
                setStatus('idle')
                setMessage(null)
              }}
              className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
            >
              Try again
            </button>
            <button
              onClick={onClose}
              className="mt-2 w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-200 active:bg-zinc-800"
            >
              Close
            </button>
          </div>
        ) : status === 'unknown' ? (
          <div className="px-1 pb-2 text-center">
            <h2 className="text-lg font-semibold">Check your wallet first</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              We lost the connection before we could confirm this swap — but it
              may still have gone through. Check your wallet's recent activity
              before trying again, so you don't swap twice.
            </p>
            {publicKey && (
              <a
                href={`https://solscan.io/account/${publicKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-accent"
              >
                View my wallet activity ↗
              </a>
            )}
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-200 active:bg-zinc-800"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="px-1 text-base font-semibold">Swap {asset.ticker}</h2>

            <div className="mt-3 flex rounded-xl bg-zinc-900 p-1">
              {['buy', 'sell'].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSide(s)
                    setAmount('')
                    setQuote(null)
                    setAckedImpact(null)
                    setStatus('idle')
                    setMessage(null)
                  }}
                  className={`flex-1 rounded-lg py-2 text-[13px] font-medium capitalize transition-colors ${
                    side === s ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <label className="mt-3 block">
              <span className="px-1 text-xs text-zinc-500">You pay ({unitLabel})</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-xl bg-zinc-900 px-4 py-3 text-lg tabular-nums text-zinc-100 placeholder-zinc-600 outline-none ring-accent/60 focus:ring-2"
              />
            </label>

            <div className="mt-3 space-y-1.5 rounded-xl bg-zinc-900/60 p-3.5 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">You receive</span>
                <span className="tabular-nums text-zinc-100">
                  {received != null
                    ? `${fmtAmount(received)} ${outLabel}`
                    : quoting
                      ? 'Quoting…'
                      : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Minimum received</span>
                <span className="tabular-nums text-zinc-400">
                  {minReceived != null ? `${fmtAmount(minReceived)} ${outLabel}` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Price impact</span>
                <span className={`tabular-nums ${impact != null && impact > 1 ? 'text-loss' : 'text-zinc-400'}`}>
                  {impact != null ? `${impact.toFixed(2)}%` : impactUnknown ? 'Unknown' : '—'}
                </span>
              </div>
            </div>

            {message && (
              <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-400">{message}</p>
            )}

            {decimalsFailed && (
              <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-400">
                Couldn’t load this token’s details. Close this and try again in a moment.
              </p>
            )}

            {impactUnknown && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3">
                <span aria-hidden="true" className="text-sm leading-5 text-amber-500">
                  ▲
                </span>
                <p className="text-xs leading-relaxed text-zinc-100">
                  <span className="font-semibold">Price impact unknown.</span> We couldn't get an
                  estimate for this route, so we can't tell you how much the trade itself will move
                  the price. Check the amount you'll receive above before confirming.
                </p>
              </div>
            )}

            {impactWarn && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3">
                <span aria-hidden="true" className="text-sm leading-5 text-amber-500">
                  ▲
                </span>
                <p className="text-xs leading-relaxed text-zinc-100">
                  <span className="font-semibold">High price impact.</span> This trade moves the
                  pool ~{impact.toFixed(2)}%. You'll get noticeably less than the market price.
                </p>
              </div>
            )}

            {impactNeedsAck && (
              <div className="mt-3 rounded-xl border border-loss/60 bg-loss/10 p-3">
                <p className="text-xs leading-relaxed text-zinc-100">
                  <span className="font-semibold text-loss">Very high price impact.</span> This
                  trade moves the pool ~{impact.toFixed(2)}%. That cost comes straight out of
                  what you receive — a smaller amount usually costs far less.
                </p>
                <label className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-1">
                  <input
                    type="checkbox"
                    checked={ackCovers}
                    onChange={(e) => setAckedImpact(e.target.checked ? impact : null)}
                    style={{ accentColor: 'var(--color-accent)' }}
                    className="h-5 w-5 shrink-0"
                  />
                  <span className="text-xs leading-relaxed text-zinc-100">
                    I understand I may lose ~{impact.toFixed(1)}% on this trade.
                  </span>
                </label>
              </div>
            )}

            {publicKey ? (
              <button
                onClick={confirm}
                // `quoting` is deliberately NOT a disable condition. A quote
                // stays on screen while the 8s refresh is in flight, so
                // disabling on it killed the button for a fraction of every
                // cycle — maddening on a high-impact trade you just
                // acknowledged. `!quote` already covers "nothing to confirm".
                disabled={!quote || status === 'signing' || blockedByImpact}
                className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
              >
                {status === 'signing'
                  ? 'Confirm in your wallet…'
                  : `Swap ${side === 'buy' ? 'into' : 'out of'} ${asset.ticker}`}
              </button>
            ) : (
              <p className="mt-3 rounded-xl bg-zinc-900 py-3 text-center text-sm text-zinc-400">
                Connect a wallet in your profile to swap.
              </p>
            )}

            <p className="mt-3 px-1 text-[11px] leading-relaxed text-zinc-400">
              Swap runs on Jupiter from your own wallet — you approve and send it in your wallet;
              BlockWatch never holds your funds. Prices move; you're guaranteed at least the
              minimum shown. Not investment advice.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
