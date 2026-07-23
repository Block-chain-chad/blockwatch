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
  const [status, setStatus] = useState('idle') // idle | signing | done | unknown | rejected
  const statusRef = useRef('idle')
  const [message, setMessage] = useState(null)
  const [sig, setSig] = useState(null)
  const reqRef = useRef(0)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  // Token decimals (needed to size a sell) from Jupiter's price API.
  useEffect(() => {
    let cancelled = false
    fetch(`https://lite-api.jup.ag/price/v3?ids=${asset.mint}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setDecimals(j?.[asset.mint]?.decimals ?? null)
      })
      .catch(() => {})
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
    if (!(amt > 0) || decimals == null) return
    const inputDecimals = side === 'buy' ? USDC_DECIMALS : decimals
    let alive = true
    const run = async () => {
      if (statusRef.current === 'signing' || statusRef.current === 'done') return
      const seq = ++reqRef.current
      setQuoting(true)
      try {
        const q = await getSwapQuote({ side, mint: asset.mint, amountRaw: toRaw(amt, inputDecimals) })
        if (!alive || seq !== reqRef.current) return
        setQuote(q)
        setQuoting(false)
        setMessage(null)
      } catch {
        if (!alive || seq !== reqRef.current) return
        setQuote(null)
        setQuoting(false)
        setMessage('No route for that size — try a different amount.')
      }
    }
    run()
    const t = setInterval(run, 8000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [amount, side, decimals, asset.mint])

  const outDecimals = side === 'buy' ? decimals : USDC_DECIMALS
  const received = quote ? fromRaw(quote.outAmount, outDecimals) : null
  const minReceived = quote ? fromRaw(quote.otherAmountThreshold, outDecimals) : null
  const impact = quote?.priceImpactPct != null ? Number(quote.priceImpactPct) * 100 : null

  async function confirm() {
    if (!quote || status === 'signing') return
    setStatus('signing')
    setMessage(null)
    try {
      const signature = await executeSwap({ quote, provider })
      setSig(signature)
      setStatus('done')
    } catch (err) {
      const m = String(err?.message ?? '').toLowerCase()
      if (err?.code === 4001 || m.includes('reject') || m.includes('declined')) {
        // Pre-broadcast: the wallet refused to sign. Safe to say nothing sent.
        setStatus('rejected')
        setMessage('Cancelled in your wallet — nothing was sent.')
      } else {
        // The tx may already be on-chain (signAndSend broadcasts before it can
        // time out). We must NOT claim it failed — that invites a double swap.
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
            <h2 className="text-lg font-semibold">Swap sent ✓</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Your {side === 'buy' ? `${asset.ticker} purchase` : `sale of ${asset.ticker}`} is
              confirming on-chain. It'll appear in your wallet shortly.
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
                  {impact != null ? `${impact.toFixed(2)}%` : '—'}
                </span>
              </div>
            </div>

            {message && (
              <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-500">{message}</p>
            )}

            {publicKey ? (
              <button
                onClick={confirm}
                disabled={!quote || status === 'signing' || quoting}
                className="bw-glow mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
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

            <p className="mt-3 px-1 text-[11px] leading-relaxed text-zinc-600">
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
