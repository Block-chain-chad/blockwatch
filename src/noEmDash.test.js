import { describe, it, expect } from 'vitest'
import { parseSync } from 'vite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/*
 * No em dashes in anything the app shows. Marcus's writing rule: rewrite the
 * sentence instead of reaching for the dash. Comments are free to use them;
 * everything else under src/ (strings, JSX text, templates) is not.
 *
 * The one allowed use is EM_DASH in lib/format.js, the placeholder a number
 * cell shows when there is no value. Every such cell goes through it, so it
 * can be changed in one place.
 */

const SRC = path.dirname(fileURLToPath(import.meta.url))
const DASH = /—|\\u2014/g
const ALLOWED = new Set([`lib/format.js:export const EM_DASH = '—'`])

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(p)
    return /\.(js|jsx)$/.test(e.name) && !/\.test\.jsx?$/.test(e.name) ? [p] : []
  })
}

function dashesOutsideComments(file) {
  const src = fs.readFileSync(file, 'utf8')
  if (!DASH.test(src)) return []
  DASH.lastIndex = 0
  const { comments, errors } = parseSync(file, src)
  expect(errors, file).toEqual([])
  const hits = []
  for (const m of src.matchAll(DASH)) {
    if (comments.some((c) => m.index >= c.start && m.index < c.end)) continue
    const lineNo = src.slice(0, m.index).split('\n').length
    const line = src.split('\n')[lineNo - 1].trim()
    const where = `${path.relative(SRC, file).split(path.sep).join('/')}`
    if (!ALLOWED.has(`${where}:${line}`)) hits.push(`${where}:${lineNo}: ${line}`)
  }
  return hits
}

describe('user-facing copy', () => {
  it('has no em dashes outside comments', () => {
    expect(sourceFiles(SRC).flatMap(dashesOutsideComments)).toEqual([])
  })

  it('still catches one', () => {
    const tmp = path.join(os.tmpdir(), `dash-probe-${process.pid}.jsx`)
    fs.writeFileSync(tmp, `// fine — a comment\nexport const X = () => <p>Saved — done</p>\n`)
    try {
      expect(dashesOutsideComments(tmp)).toHaveLength(1)
    } finally {
      fs.unlinkSync(tmp)
    }
  })
})
