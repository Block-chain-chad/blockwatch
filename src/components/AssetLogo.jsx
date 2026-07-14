import { useEffect, useState } from 'react'
import { getLogo } from '../services/stocks'

/*
 * Company logo for an asset — recognition beats reading. Falls back to a
 * clean initials circle (Coinbase-style, kept neutral per the design system)
 * while loading or when no logo exists (ETFs, treasuries).
 */
export default function AssetLogo({ asset, size = 36 }) {
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSrc(null)
    setFailed(false)
    if (asset.underlying) {
      getLogo(asset.underlying).then((url) => {
        if (!cancelled && url) setSrc(url)
      })
    }
    return () => {
      cancelled = true
    }
  }, [asset.underlying])

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full bg-white object-contain"
        style={{ width: size, height: size }}
      />
    )
  }

  const initials = (asset.underlying ?? asset.ticker).replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-zinc-800 font-semibold text-zinc-300"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
