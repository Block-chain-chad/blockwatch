import { useId, useState } from 'react'
import { gapCheck, GAP_STATUS_LABEL } from '../lib/gapCheck'
import { PARITY_BAND, isThinlyTraded } from '../lib/prices'
import { closedGapLabelFor } from '../lib/sessionCopy'
import { formatPct, changeColor } from '../lib/format'
import { parseAmount } from '../lib/holdings'
import ClosedGapMark from './ClosedGapMark'

/* Shared by the Holdings screen and its two sheets. Web only (src/webOnly.js). */

/** Under an Ondo token's rows and in its Amount field (compliance item 5). */
export const ONDO_AMOUNT_NOTE =
  'Enter the number of tokens. On some chains your wallet may show an adjusted amount that already includes reinvested dividends; if so, the value here may be off.'

const AMOUNT_HELP = {
  xStocks: 'Enter the number your wallet shows for this token.',
  Ondo: ONDO_AMOUNT_NOTE,
}

const GAP_WORDS = { ...GAP_STATUS_LABEL, none: 'No share to compare' }

/**
 * The gap chip, in the words every other screen uses. A number only when
 * lib/gapCheck.js confirms the gap; while the share leg is a close it
 * carries the closed-market mark. The value and price move never do: the
 * token price is live.
 */
export function HoldingGap({ asset, now }) {
  const check = gapCheck(asset, now)
  if (check.status === 'pending') {
    return <span data-gap="pending" className="inline-block h-3.5 w-16 animate-pulse rounded bg-zinc-800 align-middle" />
  }
  if (check.status !== 'ok') {
    return <span className="t-caption whitespace-nowrap text-zinc-500">{GAP_WORDS[check.status]}</span>
  }
  const quiet = Math.abs(check.gap) < PARITY_BAND || isThinlyTraded(asset)
  const closed = closedGapLabelFor(asset, now)
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="t-caption whitespace-nowrap">
        <span className="text-zinc-500">Gap </span>
        <span className={`num font-medium ${quiet ? 'text-zinc-500' : changeColor(check.gap)}`}>{formatPct(check.gap)}</span>
      </span>
      <ClosedGapMark label={closed} />
    </span>
  )
}

/**
 * The Amount field. Digits and one decimal point; anything else, zero, or
 * more than 18 decimals gets the one approved error. The helper line says
 * which number to type for this token's issuer.
 */
export function AmountForm({ asset, initial = '', submitLabel, onSubmit }) {
  const [value, setValue] = useState(initial)
  const [invalid, setInvalid] = useState(false)
  const id = useId()

  function submit(e) {
    e.preventDefault()
    const amount = parseAmount(value)
    if (!amount) setInvalid(true)
    else onSubmit(amount)
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4">
      <label htmlFor={id} className="t-caption text-zinc-400">
        Amount
      </label>
      <input
        id={id}
        autoFocus
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setInvalid(false)
        }}
        aria-invalid={invalid}
        aria-describedby={`${id}-help`}
        className="num mt-1.5 w-full rounded-xl bg-zinc-900 px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 outline-none ring-accent/60 focus:ring-2"
      />
      {invalid && (
        <p role="alert" className="t-caption mt-1.5 text-loss">
          Enter a number greater than zero, such as 12.5.
        </p>
      )}
      <p id={`${id}-help`} className="t-caption mt-1.5 text-zinc-500">
        {AMOUNT_HELP[asset.issuer]}
      </p>
      <button
        type="submit"
        className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
      >
        {submitLabel}
      </button>
    </form>
  )
}
