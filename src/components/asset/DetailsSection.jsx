import { ChevronDown } from '../Icons'

/* The identity table: issuer, chain, underlying, token market cap.

   `open` / `onToggle` drive the disclosure. When `onToggle` is a function
   the header is the button that flips it (the phone); when it is omitted
   the header is a plain heading and `open` says whether the body shows. */
export default function DetailsSection({ asset, open, onToggle }) {
  return (
    <div className="px-4 pt-6">
      <div className="rounded-2xl bg-zinc-900/60">
        {typeof onToggle === 'function' ? (
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-zinc-300"
          >
            Details
            <ChevronDown
              size={18}
              className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        ) : (
          <h3 className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-zinc-300">
            Details
          </h3>
        )}
        {open && (
          <dl className="space-y-2.5 px-4 pb-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Issuer</dt>
              <dd className="text-zinc-300">{asset.issuer}</dd>
            </div>
            {asset.chain && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Chain</dt>
                <dd className="text-zinc-300">{asset.chain}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-zinc-500">Underlying</dt>
              <dd className="text-zinc-300">{asset.underlying ?? 'NAV-based'}</dd>
            </div>
            {asset.marketCap != null && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Token market cap</dt>
                <dd className="tabular-nums text-zinc-300">
                  ${asset.marketCap.toLocaleString('en-US')}
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  )
}
