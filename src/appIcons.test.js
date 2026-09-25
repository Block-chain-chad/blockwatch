import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/*
 * The Home Screen icons. iOS will not use an SVG for apple-touch-icon; it
 * falls back to a screenshot of the page, so the link must point at a PNG,
 * and at the size iOS asks for. The manifest's PNGs are what Android and
 * desktop Chrome install with. Each file must exist at the size it claims,
 * and be fully opaque: both platforms mask the icon themselves and fill any
 * transparent pixel with black.
 *
 * The PNGs are rendered from public/favicon.svg with its background made
 * square; regenerate them from there if the mark changes.
 */

const publicFile = (path) => readFileSync(new URL(`../public${path}`, import.meta.url))
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const manifest = JSON.parse(publicFile('/manifest.webmanifest').toString('utf8'))

/**
 * Width and height from a PNG's IHDR chunk, checking the signature first, and
 * that the colour type is 2 (RGB with no alpha channel), which makes the file
 * opaque by construction rather than by the values of its pixels.
 */
function pngSize(buf) {
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR')
  expect(buf[25]).toBe(2)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

describe('apple-touch-icon', () => {
  it('is a 180x180 PNG linked from index.html', () => {
    const link = indexHtml.match(/<link rel="apple-touch-icon"[^>]*>/)?.[0]
    expect(link).toContain('href="/apple-touch-icon.png"')
    expect(link).toContain('sizes="180x180"')
    expect(pngSize(publicFile('/apple-touch-icon.png'))).toEqual({ width: 180, height: 180 })
  })
})

describe('manifest icons', () => {
  const pngs = manifest.icons.filter((i) => i.type === 'image/png')

  it('lists a 192 and a 512 PNG', () => {
    expect(pngs.map((i) => i.sizes).sort()).toEqual(['192x192', '512x512'])
  })

  it.each(['192x192', '512x512'])('has the %s file at the size it claims', (sizes) => {
    const icon = pngs.find((i) => i.sizes === sizes)
    const [w, h] = sizes.split('x').map(Number)
    expect(pngSize(publicFile(icon.src))).toEqual({ width: w, height: h })
  })
})
