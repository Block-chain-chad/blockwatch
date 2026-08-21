import { useEffect, useState } from 'react'
import { getTokenizationNews } from '../services/stocks'
import { timeAgo } from '../lib/format'

/*
 * Headlines about the tokenized-equity market — the subject the whole app is
 * about, which until now had no presence on the News tab at all.
 *
 * Not called "Today in tokenized stocks": that name belongs to the digest
 * above, and it would over-promise besides. Measured 2026-08-20, the beat runs
 * ~2-3 vetted stories a day and 11-17 a week, so relative timestamps tell the
 * truth at that cadence where a "today" heading would not.
 *
 * Empty and errored both render nothing. A missing section is quieter and more
 * honest than an apology box on a secondary surface — the same call DailyDigest
 * makes when it has nothing to say.
 */
export default function TokenizationNews() {
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getTokenizationNews()
      .then((rows) => alive && setItems(rows))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-900" />
      </div>
    )
  }
  if (!items || items.length === 0) return null

  return (
    <div className="pt-6">
      <h3
        className="t-micro border-b px-4 pb-1.5 text-zinc-500"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        The tokenization beat
      </h3>
      {items.map((n) => (
        <a
          key={n.id}
          href={n.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover-row block border-b px-4 py-3 transition-colors active:bg-zinc-900"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="t-label line-clamp-2 text-zinc-100">{n.headline}</div>
          <div className="t-caption mt-1 text-zinc-500">
            {n.source} · {timeAgo(n.at)}
          </div>
        </a>
      ))}
      <p className="t-caption px-4 pt-2 text-zinc-600">
        Coverage of the tokenized-equity market. Links open the source.
      </p>
    </div>
  )
}
