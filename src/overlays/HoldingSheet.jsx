import { useState } from 'react'
import Sheet, { SheetTitle } from '../components/Sheet'
import AssetLogo from '../components/AssetLogo'
import { HoldingGap, AmountForm, ONDO_AMOUNT_NOTE, NOT_AVAILABLE } from '../components/HoldingParts'
import { useAsset } from '../state/PricesContext'
import { useHoldings } from '../state/HoldingsContext'
import { useNow } from '../hooks/useNow'
import { holdingRow, formatUsd, formatMove, formatAmount, dollarGapSentence } from '../lib/holdings'

/*
 * One holding: its figures, the gap in dollars (only here, only when the gap
 * is confirmed, never in the list or a total), and the three actions. There
 * is no trade, swap or venue control here or anywhere in Holdings.
 * `notice` is a line shown above everything (the add sheet's "already in
 * your Holdings"); `startEditing` opens with the Amount field.
 */
export default function HoldingSheet({ assetId, notice = null, startEditing = false, settled = true, onClose, onOpenAsset }) {
  const { holdings, update, remove } = useHoldings()
  const asset = useAsset(assetId)
  const now = useNow(15_000)
  const [editing, setEditing] = useState(startEditing)
  const holding = holdings.find((h) => h.assetId === assetId)
  if (!holding || !asset) return null

  const row = holdingRow(holding, asset, { now, settled })
  const sentence = dollarGapSentence(holding.amount, asset, { now })

  return (
    <Sheet onClose={onClose} className="z-[55]">
      {notice && <p className="t-caption mb-3 rounded-lg bg-zinc-900 px-3 py-2.5 text-zinc-300">{notice}</p>}
      <div className="flex items-center gap-3 px-1">
        <AssetLogo asset={asset} size={36} />
        <div className="min-w-0">
          <SheetTitle className="text-base font-semibold text-zinc-100">{asset.ticker}</SheetTitle>
          <div className="t-caption truncate text-zinc-500">tracks {asset.name}</div>
        </div>
      </div>

      {editing ? (
        <AmountForm
          asset={asset}
          initial={holding.amount}
          submitLabel="Update"
          onSubmit={(amount) => {
            update(assetId, amount)
            setEditing(false)
          }}
        />
      ) : (
        <>
          <dl className="mt-4 space-y-2.5 px-1 text-sm">
            <Fact label="Estimated value">
              {row.state === 'loading' ? (
                <span className="inline-block h-4 w-20 animate-pulse rounded bg-zinc-800 align-middle" />
              ) : row.value != null ? (
                formatUsd(row.value)
              ) : (
                'No current price'
              )}
            </Fact>
            <Fact label="Amount">{`${formatAmount(holding.amount)} ${asset.ticker}`}</Fact>
            <Fact label="Price move, past 24 hours">{row.move != null ? formatMove(row.move, asset.dayChange) : NOT_AVAILABLE}</Fact>
            <Fact label="Gap">
              <HoldingGap asset={asset} now={now} settled={settled} named={false} />
            </Fact>
          </dl>
          {sentence && <p className="t-body mt-4 px-1 text-zinc-300">{sentence}</p>}
          {asset.issuer === 'Ondo' && <p className="t-caption mt-3 px-1 text-zinc-500">{ONDO_AMOUNT_NOTE}</p>}
          <div className="mt-5 grid gap-2">
            <SheetButton onClick={() => setEditing(true)}>Change amount</SheetButton>
            <SheetButton
              onClick={() => {
                onClose()
                onOpenAsset(asset)
              }}
            >
              Open token page
            </SheetButton>
            <SheetButton
              danger
              onClick={() => {
                remove(assetId, `Removed ${asset.ticker}`)
                onClose()
              }}
            >
              Remove from Holdings
            </SheetButton>
          </div>
        </>
      )}
    </Sheet>
  )
}

function Fact({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="num text-right text-zinc-200">{children}</dd>
    </div>
  )
}

function SheetButton({ danger = false, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium transition-colors active:bg-zinc-800 ${danger ? 'text-loss' : 'text-zinc-100'}`}
    >
      {children}
    </button>
  )
}
