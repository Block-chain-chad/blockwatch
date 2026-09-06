import { useState } from 'react'
import { ChevronRight } from './Icons'
import Sheet, { SheetTitle } from './Sheet'

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
  {
    id: 'basispoints',
    title: "What's a basis point?",
    body: [
      'A basis point is one hundredth of a percent. A hundred of them make 1%, so a gap of 62bp is 0.62% — a little over half a percent.',
      "Gaps this small get their own unit because most of them are small. Writing '0.62%' and '0.07%' next to each other makes them look alike; 62bp and 7bp do not. Once you are used to it, the number is faster to read, which is why the finance world quotes spreads this way.",
      "You'll see it on the daily digest, where the widest gap between two issuers of the same company is quoted in bp.",
    ],
  },
  {
    id: 'issuerrisk',
    title: 'What if the issuer goes under?',
    body: [
      "This is the honest risk of a tokenized stock, and it is different from the risk of the share itself. You own a claim on a share held by someone else — so you are exposed to that someone else, not just to the company's stock price.",
      'The shares sit with a licensed custodian, held separately from the issuer\'s own money, which is what is meant to survive the issuer failing. That structure is the protection; it is not a government guarantee, and it is not the same as holding the share in a brokerage account in your own name.',
      'What it does not protect against: the token drifting from the share price, a chain or exchange you cannot reach, or losing your own wallet keys. Each asset page lists its issuer under Details, so you can see who you are trusting.',
    ],
  },
  {
    id: 'custody',
    title: 'Who actually holds my money?',
    body: [
      'Not us. OnStock is a tracker — it reads public prices and shows you the gap. It never takes custody of your funds, never moves them, and cannot trade on your behalf.',
      "When you buy, that happens somewhere else. Tapping through to trade sends you out to Jupiter, where the swap settles on-chain from your own wallet. Your keys stay with you the whole time, which is what 'non-custodial' means: nobody in the middle can freeze, lend out or lose what you hold.",
      'The flip side of that is real: if you lose your wallet keys, no one — including us — can recover them for you.',
    ],
  },
]

function LearnSheet({ lesson, onClose }) {
  return (
    <Sheet onClose={onClose} className="z-[55]" pad={5}>
      <SheetTitle className="text-base font-semibold">{lesson.title}</SheetTitle>
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
    </Sheet>
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
