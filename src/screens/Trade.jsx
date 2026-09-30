import Header from '../components/Header'
import { track } from '../services/analytics'
import { useFlag, LINK_OUT_FLAG } from '../services/featureFlags'
import { WalletIcon } from '../components/Icons'

/*
 * Where tokens trade: neutral information about outside services. Onstock
 * does not offer trading, route orders or recommend a venue. The trading
 * waitlist closed to new sign-ups on September 30, 2026 (api/waitlist-join.js
 * answers 410), so this screen no longer asks for an email; people already on
 * the list see that in Profile.
 */

/*
 * Two tiers, because they are not equivalent. Jupiter is the one venue the
 * app can link to a token's exact pair, so it has a card when its switch is
 * on; the four exchanges share one restriction, stated once as a heading.
 */
const PRIMARY = {
  id: 'jupiter',
  name: 'Jupiter',
  href: 'https://jup.ag',
  icon: WalletIcon,
  blurb: 'An on-chain exchange you use from your own wallet. Onstock does not operate it or check whether you may use it.',
}

const RESTRICTED = ['Kraken', 'Bybit', 'Gate.io', 'KuCoin']

const NASDAQ_ORDER = 'https://www.sec.gov/files/rules/sro/nasdaq/2026/34-105047.pdf'

export default function Trade({ onOpenProfile }) {
  // The Jupiter card answers to the same switch as the per-asset link-outs.
  const linkOutOn = useFlag(LINK_OUT_FLAG)

  return (
    <div className="pb-24">
      <Header title="Venues" onOpenProfile={onOpenProfile} />

      <div className="px-4 pt-4">
        <h2 className="t-title">Where tokens trade</h2>
        <p className="t-body mt-1.5 text-zinc-400">
          Tokenized stocks trade on outside services. Onstock does not operate,
          check or recommend any of them, and each one decides who may use it.
        </p>

        {/* Switched off, the card is simply absent: a "paused" line would
            tell every visitor Onstock has trading (sign-off W2). */}
        {linkOutOn && (
          <a
            href={PRIMARY.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('trade_out', { venue: PRIMARY.id })}
            className="mt-4 flex items-start gap-3 rounded-lg border p-4 transition-colors active:bg-zinc-900"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-accent">
              <PRIMARY.icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="t-label text-zinc-100">{PRIMARY.name} ↗</span>
              <span className="t-caption mt-1 block text-zinc-500">{PRIMARY.blurb}</span>
            </span>
          </a>
        )}

        {/* The four exchanges that say in their own terms they do not serve
            United States customers. Plain names, not links, until the lawyer
            answers question 7 (sign-off W2). */}
        <h3 className="t-micro mt-6 text-zinc-500">Not offered in the United States</h3>
        <p className="t-caption mt-1 text-zinc-500">
          These exchanges say they do not serve people in the United States. The tokens'
          issuers also restrict the United Kingdom and some other countries.
        </p>
        <ul className="mt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {RESTRICTED.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between border-b py-2.5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="t-label text-zinc-400">{name}</span>
              <span className="t-caption text-zinc-500">Exchange</span>
            </li>
          ))}
        </ul>

        {/* Accurate, but about a registered exchange and registered
            securities, not the tokens Onstock tracks, so it says both. */}
        <div
          className="mt-8 border-t pt-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <p className="text-[11px] leading-relaxed text-zinc-500">
            <span className="font-medium text-zinc-400">Elsewhere in the market:</span>{' '}
            on March 18, 2026 the Securities and Exchange Commission approved a Nasdaq
            rule change allowing Nasdaq to trade registered securities in tokenized form
            during the Depository Trust Company pilot program. That is a separate market
            from the tokens Onstock tracks, and it is not an approval of Onstock or of any
            venue listed above.{' '}
            <a
              href={NASDAQ_ORDER}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-zinc-700 underline-offset-2"
            >
              Read the order
            </a>
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-zinc-400">
          These are outside services with their own terms and their own rules about who
          may use them. Onstock does not route orders, hold funds or execute trades.
        </p>
      </div>
    </div>
  )
}
