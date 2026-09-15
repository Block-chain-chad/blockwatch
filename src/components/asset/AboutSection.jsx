/* One sentence about the underlying company, built from its Finnhub
   profile. Renders nothing until the profile has arrived. */
export default function AboutSection({ asset, info }) {
  if (!info.profile) return null
  return (
    <div className="px-4 pt-6">
      <h3 className="text-sm font-semibold text-zinc-300">About {asset.underlying}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        {info.profile.name}
        {info.profile.finnhubIndustry && ` operates in ${info.profile.finnhubIndustry}`}
        {info.profile.exchange && `, listed on ${info.profile.exchange}`}
        {info.profile.ipo && ` and publicly traded since ${info.profile.ipo.slice(0, 4)}`}.{' '}
        {asset.ticker} is a token that tracks its share price
        {asset.chain ? ` on ${asset.chain}` : ''}.
      </p>
    </div>
  )
}
