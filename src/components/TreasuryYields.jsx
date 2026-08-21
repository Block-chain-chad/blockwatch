import { useEffect, useState } from 'react'
import { getTreasuryYields, MATURITIES } from '../services/rates'
import { changeColor } from '../lib/format'

/*
 * The Treasury curve, shown above the tokenized bond rows because it is what
 * those products are priced off — a short-term government bond fund is a
 * wrapper around these yields, so the rates are the context that makes the
 * rows mean something.
 *
 * Deliberately not dressed as an asset row: there is no token here, no
 * underlying and no gap, and borrowing the row layout would imply all three.
 * It is a small table of facts with its date attached.
 *
 * Yields are quoted in percent and move in hundredths, so changes render with
 * two decimals and a sign rather than going through the price formatter.
 */
export default function TreasuryYields() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getTreasuryYields()
      .then((d) => alive && setData(d))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="px-4 pt-3">
        <div className="h-20 animate-pulse rounded-2xl bg-zinc-900" />
      </div>
    )
  }
  // Unavailable renders nothing: the tokenized rows below still stand on their
  // own, and an error box would be the loudest thing on the screen.
  if (!data?.series) return null
  const rows = MATURITIES.filter((m) => data.series[m.id])
  if (rows.length === 0) return null

  return (
    <div className="pt-2">
      <h3
        className="t-micro border-b px-4 pb-1.5 text-zinc-500"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        US Treasury yields
      </h3>
      {rows.map((m) => {
        const s = data.series[m.id]
        return (
          <div
            key={m.id}
            className="flex items-baseline justify-between border-b px-4 py-2.5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span className="t-label text-zinc-300">{m.label}</span>
            <span className="flex items-baseline gap-2.5">
              <span className="num t-label text-zinc-100">{s.value.toFixed(2)}%</span>
              {s.change != null && (
                <span className={`num t-caption w-12 text-right ${changeColor(s.change)}`}>
                  {s.change > 0 ? '+' : s.change < 0 ? '−' : ''}
                  {Math.abs(s.change).toFixed(2)}
                </span>
              )}
            </span>
          </div>
        )
      })}
      <p className="t-caption px-4 pt-2 text-zinc-600">
        Daily close, {data.asOf} · source US Treasury via FRED. Change is against the previous
        reading.
      </p>
    </div>
  )
}
