import { formatCompact } from '../../lib/format'
import { formatAsOf } from '../../lib/poolLiquidity'
import { usePoolLiquidity } from '../../hooks/usePoolLiquidity'
import { ChevronDown } from '../Icons'
import { formatPrice } from '../shared'

/* Under the pool figure, always. A pool's size is easy to read as how much
   can be traded at the quoted price, which it is not. */
const POOL_SIZE_NOTE =
  "Not how much you can trade: larger trades move the price more, and other pools and exchanges aren't included."

/* One row of the Key statistics disclosure; hides itself when the value is missing. */
function StatRow({ label, value }) {
  if (value == null) return null
  return (
    <div className="flex justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="tabular-nums text-zinc-300">{value}</dd>
    </div>
  )
}

/* One row of the side-by-side comparison grid: label, stock cell, token cell. */
function CompareRow({ label, stock, token }) {
  return (
    <>
      <div className="text-zinc-500">{label}</div>
      <div className="text-right text-[13px] leading-tight tabular-nums text-zinc-300">{stock ?? '—'}</div>
      <div className="text-right text-[13px] leading-tight tabular-nums text-zinc-300">{token ?? '—'}</div>
    </>
  )
}

const compactNum = (n) =>
  Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

/* Key statistics has a token group and a stock group; either can be absent
   (token-only products have no stock side, fresh assets may lack data).
   Both sides present → the shared figures render as a side-by-side grid
   (the app's whole thesis in table form); leftovers list underneath.

   `open` / `onToggle` drive the disclosure. When `onToggle` is a function
   the header is the button that flips it (the phone); when it is omitted
   the header is a plain heading and `open` says whether the body shows. */
export default function KeyStatistics({
  asset,
  info,
  spread,
  hasTokenStats,
  hasStockStats,
  bothSides,
  open,
  onToggle,
}) {
  const liquidity = usePoolLiquidity(asset, open && hasTokenStats)
  if (!(hasTokenStats || hasStockStats)) return null
  const ts = asset.tokenStats
  return (
    <div className="px-4 pt-6">
      <div className="rounded-2xl bg-zinc-900/60">
        {typeof onToggle === 'function' ? (
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-zinc-300"
          >
            Key statistics
            <ChevronDown
              size={18}
              className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        ) : (
          <h3 className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-zinc-300">
            Key statistics
          </h3>
        )}
        {open && (
          <div className="px-4 pb-4 text-sm">
            {bothSides && (
              <div className="grid grid-cols-[1.1fr_1fr_1fr] items-center gap-x-3 gap-y-2.5 pb-1">
                <div />
                <div className="text-right text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {asset.underlying} stock
                </div>
                <div className="text-right text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {asset.ticker} token
                </div>
                <CompareRow
                  label="Price"
                  stock={asset.stockPrice != null ? formatPrice(asset.stockPrice) : null}
                  token={asset.tokenPrice != null ? formatPrice(asset.tokenPrice) : null}
                />
                <CompareRow
                  label="Range (1d)"
                  stock={
                    asset.stockQuote?.dayLow != null && asset.stockQuote?.dayHigh != null ? (
                      <>
                        {formatPrice(asset.stockQuote.dayLow)}
                        <br />– {formatPrice(asset.stockQuote.dayHigh)}
                      </>
                    ) : null
                  }
                  token={
                    ts.low24h != null && ts.high24h != null ? (
                      <>
                        {formatPrice(ts.low24h)}
                        <br />– {formatPrice(ts.high24h)}
                      </>
                    ) : null
                  }
                />
                <CompareRow
                  label="Market cap"
                  stock={
                    info.profile?.marketCapitalization > 0
                      ? formatCompact(info.profile.marketCapitalization * 1e6)
                      : null
                  }
                  token={asset.marketCap != null ? formatCompact(asset.marketCap) : null}
                />
                <CompareRow
                  label="Volume"
                  stock={
                    info.metrics?.avgVolume10d != null
                      ? `${compactNum(info.metrics.avgVolume10d)} sh`
                      : null
                  }
                  token={asset.volume24h != null ? formatCompact(asset.volume24h) : null}
                />
              </div>
            )}

            <dl className={`space-y-2.5 ${bothSides ? 'pt-2' : ''}`}>
              {hasTokenStats && (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    {asset.ticker} token
                  </div>
                  {!bothSides && (
                    <StatRow
                      label="24h range"
                      value={
                        ts.low24h != null && ts.high24h != null
                          ? `${formatPrice(ts.low24h)} – ${formatPrice(ts.high24h)}`
                          : null
                      }
                    />
                  )}
                  <StatRow
                    label="All-time high"
                    value={
                      ts.ath != null
                        ? `${formatPrice(ts.ath)}${ts.athChangePct != null ? ` (${ts.athChangePct.toFixed(1)}%)` : ''}`
                        : null
                    }
                  />
                  <StatRow
                    label="Circulating supply"
                    value={ts.supply != null ? `${compactNum(ts.supply)} tokens` : null}
                  />
                  <StatRow
                    label={
                      spread ? `Bid/ask spread (from a $${spread.refUsd} test quote)` : 'Bid/ask spread'
                    }
                    value={spread ? `${spread.spreadPct.toFixed(1)}%` : null}
                  />
                  {liquidity && (
                    <div>
                      <StatRow label="Pool size (one pool)" value={formatCompact(liquidity.usd)} />
                      <p className="pt-0.5 text-right text-[11px] text-zinc-500">
                        {liquidity.poolName ? `${liquidity.poolName} pool, ` : ''}as of{' '}
                        {formatAsOf(liquidity.asOf)}
                      </p>
                      <p className="pt-0.5 text-right text-[11px] text-zinc-500">
                        {POOL_SIZE_NOTE}
                      </p>
                    </div>
                  )}
                </>
              )}
              {hasStockStats && (
                <div className={`text-[11px] font-semibold uppercase tracking-wide text-zinc-500 ${hasTokenStats ? 'pt-2' : ''}`}>
                  {asset.underlying} stock
                </div>
              )}
              <StatRow
                label="Previous close"
                value={asset.stockQuote?.prevClose != null ? formatPrice(asset.stockQuote.prevClose) : null}
              />
              <StatRow
                label="Open"
                value={asset.stockQuote?.open != null ? formatPrice(asset.stockQuote.open) : null}
              />
              {!bothSides && (
                <StatRow
                  label="Day range"
                  value={
                    asset.stockQuote?.dayLow != null && asset.stockQuote?.dayHigh != null
                      ? `${formatPrice(asset.stockQuote.dayLow)} – ${formatPrice(asset.stockQuote.dayHigh)}`
                      : null
                  }
                />
              )}
              <StatRow
                label="52-week range"
                value={
                  info.metrics?.low52 != null && info.metrics?.high52 != null
                    ? `${formatPrice(info.metrics.low52)} – ${formatPrice(info.metrics.high52)}`
                    : null
                }
              />
              <StatRow label="P/E ratio (TTM)" value={info.metrics?.pe != null ? info.metrics.pe.toFixed(1) : null} />
              <StatRow label="EPS (TTM)" value={info.metrics?.eps != null ? formatPrice(info.metrics.eps) : null} />
              <StatRow
                label="Dividend yield"
                value={info.metrics?.divYield != null ? `${info.metrics.divYield.toFixed(2)}%` : null}
              />
              <StatRow label="Beta" value={info.metrics?.beta != null ? info.metrics.beta.toFixed(2) : null} />
              {!bothSides && (
                <StatRow
                  label="Avg volume (10d)"
                  value={info.metrics?.avgVolume10d != null ? `${compactNum(info.metrics.avgVolume10d)} shares` : null}
                />
              )}
              {hasStockStats && (
                <p className="pt-1 text-[11px] leading-relaxed text-zinc-500">
                  Stock figures describe {asset.underlying}, the share this token tracks.
                </p>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
