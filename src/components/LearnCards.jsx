import { useState } from 'react'
import { ChevronRight } from './Icons'

// Plain-language explainers for an audience with zero crypto knowledge —
// the one concept-per-card, tap-to-read pattern (no slideshow, no quiz).
const LESSONS = [
  {
    id: 'premium',
    title: "What's a premium?",
    body: [
      'A tokenized stock usually trades within a whisker of the real share price. The pill on each row shows the gap: green means the token costs more than the stock (a premium), red means less (a discount), and gray means they match (1:1).',
      "Small gaps are normal — tokens trade around the clock on their own markets, so supply and demand nudge them off the stock price. Big, persistent gaps are worth noticing: they mean token traders are paying up (or bailing out) relative to the real thing.",
      'The Premium history chart on every asset page shows whether today\'s gap is typical for that asset or something new.',
    ],
  },
  {
    id: 'backing',
    title: 'How are tokens backed?',
    body: [
      'Each token is issued against a real share. The issuer buys actual stock and holds it with a licensed custodian; the token is a claim on that share, which is why its price hugs the real one.',
      'That anchor works through redemption: if the token got much cheaper than the stock, professional traders could buy tokens, redeem for shares, and pocket the difference — and that very trade pulls prices back together.',
      "You can check the details on any asset page under 'Details': the issuer, the chain it lives on, and the stock it tracks.",
    ],
  },
  {
    id: 'weekend',
    title: 'Why weekend prices drift',
    body: [
      'The US stock market closes at 4 PM Eastern on Friday. Tokens don\'t close — they keep trading nights, weekends, and holidays.',
      "While the market is closed, we compare tokens against the stock's last closing price, and the app labels it that way. A token drifting a percent or two over a weekend isn't an error — it's a live guess about where the stock will open on Monday.",
      'That gap usually snaps back within minutes of the market reopening.',
    ],
  },
  {
    id: 'issuers',
    title: 'Meet the issuers',
    body: [
      'Two companies issue most of the tokens here. xStocks (by Swiss firm Backed) live on the Solana blockchain and trade on exchanges like Kraken and Bybit. Ondo Global Markets tokens live on Ethereum.',
      'The same stock can be tokenized by both — NVIDIA exists as NVDAx and NVDAon — usually at slightly different prices.',
      "When an asset has a sibling from the other issuer, its page shows an 'Also tokenized by' section so you can compare and pick the cheaper one.",
    ],
  },
]

function LearnSheet({ lesson, onClose }) {
  return (
    <div className="fixed inset-0 z-[55] mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 overlay-in bg-black/60" />
      <div className="relative sheet-in w-full rounded-t-3xl bg-zinc-950 p-5 pb-[max(env(safe-area-inset-bottom),20px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-800" />
        <h2 className="text-base font-semibold">{lesson.title}</h2>
        <div className="mt-3 max-h-[50vh] space-y-3 overflow-y-auto">
          {lesson.body.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-zinc-400">
              {p}
            </p>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

export default function LearnCards() {
  const [open, setOpen] = useState(null)
  return (
    // A list, not a horizontal card rail. Four short titles in a scroller meant
    // the fourth was always cut off and the third read as "Why weeke…", and it
    // was the only sideways-scrolling thing left in the app. A list shows all
    // four, needs no affordance, and matches every other section here.
    <div className="pt-6">
      <h3
        className="t-micro border-b px-4 pb-1.5 text-zinc-500"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        Learn the basics
      </h3>
      {LESSONS.map((l) => (
        <button
          key={l.id}
          onClick={() => setOpen(l)}
          className="hover-row flex w-full items-center justify-between border-b px-4 py-2.5 text-left transition-colors active:bg-zinc-900"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <span className="t-label text-zinc-300">{l.title}</span>
          <ChevronRight size={16} className="shrink-0 text-zinc-600" />
        </button>
      ))}
      {open && <LearnSheet lesson={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
