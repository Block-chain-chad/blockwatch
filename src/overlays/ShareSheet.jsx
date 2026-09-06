import { useState } from 'react'
import { premiumPct } from '../lib/prices'
import { formatPrice, formatPct } from '../lib/format'
import { track } from '../services/analytics'

const CARD = 1080 // square PNG, social-friendly

function drawLogo(ctx, ox, oy, scale) {
  const line = (pts, color) => {
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5 * scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach(([px, py], i) => {
      const X = ox + px * scale
      const Y = oy + py * scale
      i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y)
    })
    ctx.stroke()
  }
  line([[8, 21], [13, 14], [17, 17], [24, 8]], '#2dd4bf')
  line([[8, 24], [13, 19], [17, 21], [24, 13]], '#52525b')
}

/** Render the share card to a canvas and return a PNG blob. */
async function makeCardBlob(asset) {
  const p = premiumPct(asset)
  const canvas = document.createElement('canvas')
  canvas.width = CARD
  canvas.height = CARD
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#09090b'
  ctx.fillRect(0, 0, CARD, CARD)

  // brand
  drawLogo(ctx, 84, 76, 3.4)
  ctx.fillStyle = '#f4f4f5'
  ctx.font = '600 52px sans-serif'
  ctx.fillText('OnStock', 190, 148)

  // asset identity
  ctx.fillStyle = '#71717a'
  ctx.font = '400 44px sans-serif'
  ctx.fillText(
    `${asset.name} · ${asset.issuer}${asset.chain ? ` on ${asset.chain}` : ''}`,
    84,
    360
  )
  ctx.fillStyle = '#f4f4f5'
  ctx.font = '700 110px sans-serif'
  ctx.fillText(asset.ticker, 84, 480)

  // the headline number: premium/discount
  if (p != null) {
    ctx.fillStyle = p > 0 ? '#34d399' : p < 0 ? '#f87171' : '#a1a1aa'
    ctx.font = '700 190px sans-serif'
    ctx.fillText(formatPct(p), 84, 700)
    ctx.fillStyle = '#a1a1aa'
    ctx.font = '400 52px sans-serif'
    ctx.fillText(`vs ${asset.underlying} stock`, 84, 776)
  } else if (asset.tokenPrice != null) {
    ctx.fillStyle = '#f4f4f5'
    ctx.font = '700 190px sans-serif'
    ctx.fillText(formatPrice(asset.tokenPrice), 84, 700)
  }

  // price footer
  ctx.fillStyle = '#71717a'
  ctx.font = '400 42px sans-serif'
  const parts = []
  if (asset.tokenPrice != null) parts.push(`Token ${formatPrice(asset.tokenPrice)}`)
  if (asset.stockPrice != null) parts.push(`Stock ${formatPrice(asset.stockPrice)}`)
  ctx.fillText(parts.join('   ·   '), 84, 920)
  ctx.fillStyle = '#52525b'
  ctx.font = '400 36px sans-serif'
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  ctx.fillText(`${date} · prices are informational, not investment advice`, 84, 984)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

export default function ShareSheet({ asset, onClose }) {
  const [note, setNote] = useState(null)
  const p = premiumPct(asset)

  async function share() {
    track('share', { ticker: asset.ticker, action: 'share' })
    const blob = await makeCardBlob(asset)
    const file = new File([blob], `onstock-${asset.ticker}.png`, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${asset.ticker} on OnStock` })
        return
      } catch {
        // user cancelled or share failed — fall through to download
      }
    }
    download(blob)
  }

  async function copy() {
    track('share', { ticker: asset.ticker, action: 'copy' })
    try {
      const blob = await makeCardBlob(asset)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setNote('Copied — paste it anywhere.')
    } catch {
      setNote("Couldn't copy here — use Save image instead.")
    }
  }

  async function download(existingBlob) {
    if (!existingBlob) track('share', { ticker: asset.ticker, action: 'download' })
    const blob = existingBlob ?? (await makeCardBlob(asset))
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `onstock-${asset.ticker}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 overlay-in bg-black/60" />
      <div className="relative sheet-in w-full rounded-t-3xl bg-zinc-950 p-4 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-800" />
        <h2 className="px-1 text-base font-semibold">Share {asset.ticker}</h2>

        {/* DOM preview mirroring the generated PNG */}
        <div className="mt-3 rounded-2xl bg-zinc-900 p-5 ring-1 ring-zinc-800/60">
          <div className="flex items-center gap-1.5">
            <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M8 21 L13 14 L17 17 L24 8" stroke="#2dd4bf" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 24 L13 19 L17 21 L24 13" stroke="#52525b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-semibold text-zinc-300">OnStock</span>
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            {asset.name} · {asset.issuer}
            {asset.chain ? ` on ${asset.chain}` : ''}
          </div>
          <div className="text-xl font-bold">{asset.ticker}</div>
          {p != null ? (
            <>
              <div className={`mt-1 text-4xl font-bold tabular-nums ${p > 0 ? 'text-gain' : p < 0 ? 'text-loss' : 'text-zinc-400'}`}>
                {formatPct(p)}
              </div>
              <div className="mt-0.5 text-sm text-zinc-400">vs {asset.underlying} stock</div>
            </>
          ) : (
            <div className="mt-1 text-4xl font-bold tabular-nums">
              {asset.tokenPrice != null ? formatPrice(asset.tokenPrice) : '—'}
            </div>
          )}
          <div className="mt-3 text-xs text-zinc-500">
            {asset.tokenPrice != null && <>Token {formatPrice(asset.tokenPrice)}</>}
            {asset.stockPrice != null && <> · Stock {formatPrice(asset.stockPrice)}</>}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={share}
            className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
          >
            Share
          </button>
          <button
            onClick={copy}
            className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-200 transition-colors active:bg-zinc-800"
          >
            Copy image
          </button>
          <button
            onClick={() => download()}
            className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-200 transition-colors active:bg-zinc-800"
          >
            Save image
          </button>
        </div>
        {note && <p className="mt-2 px-1 text-center text-xs text-zinc-500">{note}</p>}
      </div>
    </div>
  )
}
