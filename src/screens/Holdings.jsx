import { useEffect, useState } from 'react'
import Header from '../components/Header'
import AssetLogo from '../components/AssetLogo'
import { HoldingGap, ONDO_AMOUNT_NOTE, NOT_AVAILABLE } from '../components/HoldingParts'
import { PlusIcon } from '../components/Icons'
import AddHoldingSheet from '../overlays/AddHoldingSheet'
import HoldingSheet from '../overlays/HoldingSheet'
import SignInSheet from '../overlays/SignInSheet'
import { usePrices, useAssetSubscription } from '../state/PricesContext'
import { useHoldings } from '../state/HoldingsContext'
import { useAuth } from '../state/AuthContext'
import { useNow } from '../hooks/useNow'
import { track } from '../services/analytics'
import { summarize, coverageLines, formatUsd, formatMove, formatAmount, alreadyHeld } from '../lib/holdings'
import { isThinlyTraded } from '../lib/prices'
import { timeAgo } from '../lib/format'

/*
 * Holdings (web only, src/webOnly.js): tokens and amounts a person typed in,
 * valued at current prices. Read only: Onstock cannot see or move anyone's
 * tokens, and nothing here trades, swaps or links to a venue. Wording is the
 * approved text in team/strategist/holdings-build-brief-v3.md section 4.
 *
 * Nothing about a holding goes into the address bar, the page title or
 * analytics: the tab has no route of its own.
 */

// How long a token with no price yet shows a placeholder before it is called
// "No current price". Prices for tokens outside the core list are fetched
// only once this screen subscribes to them.
const PRICE_SETTLE_MS = 8000

function useSettled(ms) {
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), ms)
    return () => clearTimeout(t)
  }, [ms])
  return settled
}

const Skeleton = ({ className }) => <span className={`inline-block animate-pulse rounded bg-zinc-800 align-middle ${className}`} />

export default function Holdings({ onOpenProfile, onOpenAsset, settleMs = PRICE_SETTLE_MS }) {
  const { holdings, loaded, signedIn } = useHoldings()
  const { byId, status } = usePrices()
  const { available } = useAuth()
  const now = useNow(15_000)
  const settled = useSettled(settleMs) && status !== 'loading'
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState(null) // { assetId, notice, startEditing }
  const [signingIn, setSigningIn] = useState(false)

  useAssetSubscription(
    'holdings',
    holdings.map((h) => h.assetId),
  )
  useEffect(() => {
    track('holdings_opened')
  }, [])

  const summary = summarize(holdings, byId, { now, settled })
  const openExisting = (assetId) =>
    setOpen({ assetId, startEditing: true, notice: alreadyHeld(byId[assetId]?.ticker ?? '') })

  let body
  if (!loaded) {
    body = (
      <div className="px-4 pt-4">
        <Skeleton className="h-10 w-48" />
      </div>
    )
  } else if (summary.total === 0) {
    body = (
      <div className="px-6 pt-14 text-center">
        <p className="t-body text-zinc-300">
          Add tokens you already hold to see their estimated value, and how far each token's price sits from the share it
          tracks.
        </p>
        <button
          onClick={() => setAdding(true)}
          className="mt-5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
        >
          Add a holding
        </button>
        <p className="t-caption mx-auto mt-4 max-w-xs text-zinc-500">
          {signedIn
            ? "Onstock can't see or move your tokens. You type the amounts in, and they sync to your account."
            : "Onstock can't see or move your tokens. You type the amounts in, and they are kept on this device."}
        </p>
      </div>
    )
  } else {
    body = (
      <>
        <Summary summary={summary} />
        <div className="mt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {summary.rows.map((row) => (
            <HoldingRow key={row.assetId} row={row} now={now} settled={settled} onOpen={() => setOpen({ assetId: row.assetId })} />
          ))}
        </div>
        <div className="px-4 pt-4">
          <button
            onClick={() => setAdding(true)}
            className="t-label flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-zinc-400 transition-colors active:bg-zinc-900"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <PlusIcon size={18} />
            Add a holding
          </button>
        </div>
        <div className="t-caption space-y-2 px-4 pt-6 text-zinc-500">
          <p>
            Tokens are not the shares they track. They give no shareholder rights, and each token's issuer decides who may
            hold or redeem it.
          </p>
          <p>
            Amounts can change without a trade. xStocks add reinvested dividends and stock splits to your wallet balance,
            so the number you typed can fall behind. Check your wallet and update it here.
          </p>
          {!signedIn && (
            <p>
              Kept on this device only.{' '}
              {available ? (
                <button onClick={() => setSigningIn(true)} className="text-accent">
                  Sign in
                </button>
              ) : (
                'Sign in'
              )}{' '}
              to keep them across devices.
            </p>
          )}
        </div>
      </>
    )
  }

  return (
    // One centred column on the desktop, narrower than the other screens.
    <div className="pb-24 lg:mx-auto lg:max-w-[560px]">
      <Header title="Holdings" onOpenProfile={onOpenProfile} />
      {body}

      {adding && <AddHoldingSheet onClose={() => setAdding(false)} onExisting={openExisting} />}
      {open && (
        <HoldingSheet
          key={open.assetId}
          assetId={open.assetId}
          notice={open.notice}
          startEditing={open.startEditing}
          settled={settled}
          onClose={() => setOpen(null)}
          onOpenAsset={onOpenAsset}
        />
      )}
      {signingIn && <SignInSheet onClose={() => setSigningIn(false)} />}
    </div>
  )
}

/* The top of the screen: the estimated value large, the price move under it. */
function Summary({ summary }) {
  const lines = coverageLines(summary)
  return (
    <section className="px-4 pt-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="t-caption text-zinc-400">Estimated value</h2>
        {!summary.loading && summary.pricesAt != null && (
          <span className="t-caption text-zinc-500">Prices updated {timeAgo(summary.pricesAt)}</span>
        )}
      </div>
      <div className="num mt-1 text-[34px] font-semibold leading-tight tracking-tight text-zinc-100">
        {summary.loading ? <Skeleton className="h-9 w-44" /> : summary.value != null ? formatUsd(summary.value) : NOT_AVAILABLE}
      </div>
      {!summary.loading && (
        <>
          <div className="t-caption mt-1.5">
            <span className="text-zinc-500">Price move, past 24 hours </span>
            <span className="num font-medium text-zinc-300">
              {summary.move != null ? formatMove(summary.move, summary.movePct) : NOT_AVAILABLE}
            </span>
          </div>
          {lines.map((line) => (
            <p key={line} className="t-caption mt-1 text-zinc-400">
              {line}
            </p>
          ))}
        </>
      )}
      <p className="t-caption mt-3 text-zinc-500">
        Estimated from the amounts you entered and third-party prices, which may be delayed or wrong. Not a statement from
        any broker, exchange or issuer.
      </p>
    </section>
  )
}

/* One holding, in the Home list's row style. */
function HoldingRow({ row, now, settled, onOpen }) {
  const { asset } = row
  return (
    <button
      onClick={onOpen}
      className="hover-row flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors active:bg-zinc-900"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <AssetLogo asset={asset} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="t-label text-zinc-100">{asset.ticker}</span>
          <span className="num t-label shrink-0 text-zinc-100">
            {row.state === 'loading' ? (
              <Skeleton className="h-4 w-20" />
            ) : row.state === 'no-price' ? (
              <span className="t-caption text-zinc-500">No current price</span>
            ) : (
              formatUsd(row.value)
            )}
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <span className="t-caption truncate text-zinc-500">{`${formatAmount(row.amount)} ${asset.ticker} · tracks ${asset.name}`}</span>
          {row.move != null && (
            <span className="num t-caption shrink-0 text-zinc-400">{formatUsd(row.move, { sign: true })}</span>
          )}
        </div>
        <div className="mt-1.5">
          <HoldingGap asset={asset} now={now} settled={settled} />
        </div>
        {isThinlyTraded(asset) && <p className="t-caption mt-1 text-zinc-500">Thinly traded. Value can swing on small trades.</p>}
        {asset.issuer === 'Ondo' && <p className="t-caption mt-1 text-zinc-500">{ONDO_AMOUNT_NOTE}</p>}
      </div>
    </button>
  )
}
