import { useEffect, useRef, useState } from 'react'
import { useWallet } from '../state/WalletContext'
import {
  getSwapQuote,
  executeSwap,
  toRaw,
  sellAmountRaw,
  formatWallet,
  USDC_DECIMALS,
  SLIPPAGE_BPS,
} from '../services/swap'
import { verifiedToken, VERIFIED_AT } from '../data/verifiedMints'
import { effectiveMultiplier, reconcileRatio } from '../lib/multiplier'
import { fetchLiveRatio } from '../services/jupiter'
import { useFlag, SWAP_FLAG, SWAP_PAUSED_LINE } from '../services/featureFlags'
import Sheet, { SheetTitle } from '../components/Sheet'

/*
 * Non-custodial swap sheet. Buy (spend USDC) or sell (spend token); a live
 * quote refreshes as you type and every few seconds, showing the minimum
 * received — the floor below which the transaction fails rather than settles
 * — and the route's price impact. Confirming hands an unsigned
 * transaction to the wallet — the user signs and sends inside Phantom, funds
 * never touch OnStock. No platform fee is applied anywhere.
 *
 * The mint and its decimals come from data/verifiedMints — the address the
 * issuer vouches for on chain — not from the asset record and not from a
 * price API answering at swap time. An unverified asset gets no swap here.
 *
 * UNITS. Three of them meet on this screen, and confusing two costs money:
 *
 *   raw      the integer Jupiter quotes in and the transaction carries.
 *   base     raw / 10^decimals. Never shown to anyone.
 *   wallet   base * multiplier. What Phantom displays, what the issuer means
 *            by "one token is one share", and therefore the only unit a user
 *            can be typing or reading.
 *
 * So every number a human touches on this sheet is in wallet units, and every
 * number handed to Jupiter or to executeSwap is raw. The two conversions are
 * marked below. 66 of the 103 pinned mints have a multiplier that is not 1,
 * so for most assets these are not the same number.
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
// How often a resting quote re-quotes. Note this is SHORTER than the quote
// request timeout in services/swap.js — see the in-flight guard in the quote
// effect, which is what keeps the two from fighting.
const QUOTE_REFRESH_MS = 8000
// The slippage tolerance the user is actually trading under, as a percentage,
// derived from the single definition in services/swap.js so the number on
// screen can never drift from the number sent to Jupiter. It is fixed: the
// sheet offers no control over it, and the copy says so.
const SLIPPAGE_PCT = SLIPPAGE_BPS / 100

export default function SwapSheet({ asset, onClose }) {
  const { publicKey, provider } = useWallet()
  // The remote switch. Read synchronously and fail-closed, so this sheet is
  // never briefly usable while an answer is on its way. TradeButton already
  // refuses to open it; this is the second lock on the same door, as with the
  // unverified-mint check below.
  const swapAllowed = useFlag(SWAP_FLAG)
  // The verified token, or nothing. Both the address we trade and the
  // decimals we size the trade with come from here — pinned, checked against
  // the issuer on chain, and the same on every render.
  const token = verifiedToken(asset)
  const mint = token?.mint ?? null
  const decimals = token?.decimals ?? null
  const [side, setSide] = useState('buy')
  const [amount, setAmount] = useState('')
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
  const reqRef = useRef(0)
  // The double-submit lock. `status` is a state update — it has not landed
  // when a second tap arrives in the same tick, and two taps on a phone
  // routinely do. A ref flips synchronously, so the second call returns
  // before it can ask the wallet for anything. services/swap.js holds the
  // same line independently, for callers that are not this sheet.
  const submittingRef = useRef(false)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  // The issuer's share-per-token ratio.
  //
  // The pin is issuer-verified but only knows changes scheduled before
  // verify-mints last ran, and the issuer schedules them continuously — so
  // this also asks Jupiter what the chain says now, and reconcileRatio decides
  // between them: inside the band it takes the live value, above the band only
  // when the live config proves it is the pin's own ratio moved forward, and
  // below the floor never — a ratio read too low oversells in proportion.
  // Anything it will not vouch for yields null and stops the trade.
  //
  // `undefined` means the live read has not answered yet. Until it does the
  // pin stands: it is the verified value, just possibly a step behind.
  const [liveRatio, setLiveRatio] = useState(undefined)
  useEffect(() => {
    setLiveRatio(undefined)
    if (!mint) return
    let alive = true
    fetchLiveRatio(mint).then(
      (r) => alive && setLiveRatio(r),
      // A non-ok response, a network failure or the timeout. All of them mean
      // the same thing here: no live answer, so the pin stands.
      () => alive && setLiveRatio(null)
    )
    return () => {
      alive = false
    }
  }, [mint])
  const multiplier =
    liveRatio === undefined
      ? effectiveMultiplier(token)
      : reconcileRatio(token, liveRatio, { mint, verifiedAt: VERIFIED_AT })

  // What the user asked for, in the input mint's smallest units — the single
  // definition, used to quote AND to state the intent at confirm time. Scaled
  // from the raw STRING, not a coerced number: toRaw does BigInt string math
  // (and expands "1e5" itself), so a 20-digit input cannot silently mis-size
  // the transaction the way a float round-trip would. null means there is no
  // amount to work with yet; '0' means below one atomic unit of this mint.
  //
  // UNITS, and the reason this is not one line.
  //
  // Buying, the input is USDC: no ratio, nothing to convert.
  //
  // Selling, the input is the token, and the number the user types is the one
  // they read off Phantom — which is the UI amount, raw/10^decimals scaled by
  // the multiplier. The chain is sized in raw. Treating the typed figure as
  // raw/10^decimals, which is what this did before, oversells by the
  // multiplier: "1" on NFLXx built a transaction for ten NFLXx as the wallet
  // counts them. uiToRaw undoes the scaling, in exact BigInt fraction math so
  // no float reaches a transaction size, and truncates so the trade is
  // marginally smaller than asked rather than larger.
  //
  // uiToRaw returns null on a ratio it cannot parse. That null flows straight
  // through to "no amount", so an unreadable ratio stops the trade instead of
  // quietly defaulting to 1 — defaulting to 1 IS the bug.
  // A refused ratio stops BOTH sides, not just the sell. Buying is sized in
  // USDC, so the amount would be right — but the whole promise of the trade is
  // "you receive N tokens", and N is quoted in the unit the wallet displays,
  // which is exactly what a refused ratio means we cannot compute. Leaving
  // that as a dash beside a live Confirm button is an unpriced trade with a
  // working button.
  const typed = Number(amount)
  const amountRaw =
    decimals == null || multiplier == null || !(typed > 0) || !Number.isFinite(typed)
      ? null
      : side === 'buy'
        ? toRaw(amount, USDC_DECIMALS)
        : sellAmountRaw(amount, decimals, multiplier)

  // Live quote: re-quotes on amount/side change and every 8s so a resting
  // quote can't go stale. Does NOT depend on `status`; pauses via statusRef
  // once the user starts signing or the swap is terminal.
  useEffect(() => {
    setQuote(null)
    setMessage(null)
    // A different amount or side is a different trade — any acknowledgment
    // made against the old numbers is void.
    setAckedImpact(null)
    if (amountRaw == null) {
      // Usually there is simply nothing typed yet, and silence is right. But
      // a positive amount with no raw size means the ratio was refused — we
      // cannot say how many shares one token stands for, so we will not size
      // a trade in it. That has to be said: an unexplained dash beside a live
      // Confirm button reads as a glitch worth retrying.
      //
      // Wording is the Compliance Reviewer's, verbatim. Do not paraphrase it
      // without sending the new version back.
      //
      // What the previous attempt got wrong, and why this is narrower. It
      // asserted the ISSUER had changed the ratio, when three of the four
      // paths that land here are Onstock's own gap: an unreadable feed, an
      // unparseable value, a difference we will not vouch for, and only then
      // an actual change. It said "we haven't re-checked it" while the sheet
      // re-checks on every open. It promised the user's tokens were
      // unaffected on the BUY side, where they may hold none. And it said
      // they could still be swapped from the wallet, which is an availability
      // claim Onstock cannot support: Backed's mints carry pause and
      // blocklist extensions, Jupiter excludes US wallets, and no region gate
      // exists here yet.
      //
      // What is left is only what this screen actually knows: it cannot state
      // the size, so it will not size it, and nothing has happened.
      setQuoting(false)
      if (typed > 0 && Number.isFinite(typed) && decimals != null) {
        setMessage(
          `We can't confirm how many shares one ${asset.ticker} token currently represents right now, so we won't size a trade we can't state the size of. Nothing has been sent and your balance is unchanged.`
        )
      }
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
        const q = await getSwapQuote({ side, mint, amountRaw })
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
  }, [amountRaw, side, mint, typed, decimals, asset.ticker])

  const outDecimals = side === 'buy' ? decimals : USDC_DECIMALS
  // Formatted straight from the integer units Jupiter quoted — no float step
  // between the promise and the pixel.
  //
  // UNITS. Jupiter quotes raw amounts. Buying, the output is the token, and
  // the wallet that receives it will show raw/10^decimals scaled by the
  // multiplier — so these two lines have to scale too, or this sheet promises
  // 0.129 NFLXx and Phantom then shows 1.29. rawToUi multiplies the integer by
  // the ratio as an exact fraction and truncates, so what is displayed is
  // never more than the chain will deliver. Selling, the output is USDC, which
  // has no ratio.
  //
  // This is display only. The transaction is sized by amountRaw above and the
  // quote Jupiter built, both of which stay raw.
  const outMultiplier = side === 'buy' ? multiplier : '1'
  const received = quote ? formatWallet(quote.outAmount, outDecimals, outMultiplier) : null
  const minReceived = quote
    ? formatWallet(quote.otherAmountThreshold, outDecimals, outMultiplier)
    : null
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
    if (!quote || !mint || !amountRaw || amountRaw === '0') return
    if (submittingRef.current || blockedByImpact) return
    submittingRef.current = true
    setStatus('signing')
    setMessage(null)
    try {
      const signature = await executeSwap({
        quote,
        provider,
        // What the user asked for, scaled from what they typed — NOT read
        // back off the quote. Stating it independently is what lets the
        // service check one against the other.
        // `typedAmount` and `multiplier` are carried for the audit record,
        // not for sizing: amountRaw is already the only figure that sizes
        // anything. They are what makes the record answerable later — the
        // ratio moves on the issuer's schedule, so reading it back afterwards
        // gives a different number than the one this trade used.
        intent: {
          side,
          mint,
          amountRaw,
          ticker: asset.ticker,
          typedAmount: amount,
          multiplier,
        },
      })
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
        // The wallet refused to sign. Nothing was broadcast, so the form goes
        // live again — and the lock has to come off with it.
        submittingRef.current = false
        setStatus('rejected')
        setMessage('Cancelled in your wallet — nothing was sent.')
      } else if (err?.phase === 'build') {
        // Threw before the wallet was ever handed the transaction (see
        // services/swap.js): we can promise nothing left the wallet, and
        // "Try again" is safe.
        submittingRef.current = false
        setStatus('failed')
        // Refusals that are about THIS trade rather than the connection are
        // worth naming — "couldn't build" alone invites a blind retry.
        setMessage(err?.code === 'simulation' ? err.message : null)
      } else {
        // Anything else — including an untagged error — is treated as
        // possibly-broadcast. signAndSend broadcasts before it can time out,
        // so we must NOT claim it failed: that invites a double swap.
        setStatus('unknown')
        // A repeat of a swap we already lost track of names the earlier
        // attempt, so the screen is about that one and not this tap.
        setMessage(err?.code === 'unresolved' ? err.message : null)
      }
    }
  }

  const unitLabel = side === 'buy' ? 'USDC' : asset.ticker
  const outLabel = side === 'buy' ? asset.ticker : 'USDC'

  // Switched off. Only while nothing has been handed to the wallet yet: if
  // the flag flips mid-signature we must NOT replace the outcome screen with
  // this card, because "submitted" and "we lost track of it" are the two
  // things the user most needs to read. `idle` and `rejected` both mean
  // nothing is in flight.
  const nothingInFlight = status === 'idle' || status === 'rejected'
  if (!swapAllowed && nothingInFlight) {
    return (
      <Sheet onClose={onClose} className="z-[55]">
        <div className="px-1 pb-2 text-center">
          <SheetTitle className="text-lg font-semibold">Swapping is paused</SheetTitle>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {SWAP_PAUSED_LINE} Nothing is wrong with your wallet, and your
            watchlists and alerts are unaffected.
          </p>
          <button
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-200 active:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </Sheet>
    )
  }

  // No verified address, no swap. TradeButton already keeps this sheet shut
  // in that case; this is the second lock on the same door, because the cost
  // of being wrong is the user's money in the wrong token.
  if (!mint) {
    return (
      <Sheet onClose={onClose} className="z-[55]">
        <div className="px-1 pb-2 text-center">
          <SheetTitle className="text-lg font-semibold">Can’t swap this one here</SheetTitle>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            We haven’t confirmed {asset.ticker}’s token address with its issuer, so we won’t
            send your money to it. Nothing is wrong with your wallet.
          </p>
          <button
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-200 active:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet onClose={onClose} className="z-[55]">
      {status === 'done' ? (
        <div className="px-1 pb-2 text-center">
          <SheetTitle className="text-lg font-semibold">Swap submitted</SheetTitle>
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
          <SheetTitle className="text-lg font-semibold">Couldn’t build this swap</SheetTitle>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Nothing was sent and nothing left your wallet — safe to try again.
          </p>
          {message && <p className="mt-2 text-xs leading-relaxed text-zinc-400">{message}</p>}
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
          <SheetTitle className="text-lg font-semibold">Check your wallet first</SheetTitle>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            We lost the connection before we could confirm this swap — but it
            may still have gone through. Check your wallet's recent activity
            before trying again, so you don't swap twice.
          </p>
          {message && <p className="mt-2 text-xs leading-relaxed text-zinc-400">{message}</p>}
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
          <SheetTitle className="px-1 text-base font-semibold">Swap {asset.ticker}</SheetTitle>

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
              className="mt-1 w-full rounded-xl bg-zinc-900 px-4 py-3 text-lg tabular-nums text-zinc-100 placeholder-zinc-500 outline-none ring-accent/60 focus:ring-2"
            />
          </label>

          <div className="mt-3 space-y-1.5 rounded-xl bg-zinc-900/60 p-3.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">You receive</span>
              <span className="tabular-nums text-zinc-100">
                {received != null ? `${received} ${outLabel}` : quoting ? 'Quoting…' : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Minimum received</span>
              <span className="tabular-nums text-zinc-400">
                {minReceived != null ? `${minReceived} ${outLabel}` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Price impact</span>
              <span className={`tabular-nums ${impact != null && impact > 1 ? 'text-loss' : 'text-zinc-400'}`}>
                {impact != null ? `${impact.toFixed(2)}%` : impactUnknown ? 'Unknown' : '—'}
              </span>
            </div>
            <p className="pt-1 text-[11px] leading-relaxed text-zinc-500">
              Slippage tolerance is fixed at {SLIPPAGE_PCT}% and can't be changed here.
              Sending the swap costs a Solana network fee, paid from your wallet on top
              of the amount above.
            </p>
          </div>

          {message && (
            <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-400">{message}</p>
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
            OnStock never holds your funds. If the price moves past the minimum shown, the
            swap fails and nothing is exchanged. You still pay the Solana network fee. Not
            investment advice.
          </p>
        </>
      )}
    </Sheet>
  )
}
