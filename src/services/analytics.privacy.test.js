import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/*
 * What analytics may never carry: an email, a token of any kind, a password,
 * a nonce, an OAuth or Apple code, or anything about a passkey. This reads
 * every track() call in the app and checks its properties, so a new call
 * that reaches for one of those fails here before it ships. It also checks
 * that every event the app sends is listed in the catalog at the top of
 * services/analytics.js, so the list stays the whole truth.
 *
 * The runtime side is covered where each event fires (AuthContext,
 * socialSignIn, passkeys, authLinks and account deletion tests assert the
 * exact payloads); this is the net under all of them.
 */

const SRC = new URL('..', import.meta.url).pathname

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(js|jsx)$/.test(name) && !/\.test\.(js|jsx)$/.test(name) ? [path] : []
  })
}

/** Every track(...) call, with its argument text, balanced on parentheses. */
function trackCalls() {
  const calls = []
  for (const file of sourceFiles(SRC)) {
    if (file.endsWith('services/analytics.js')) continue
    const text = readFileSync(file, 'utf8')
    const re = /\btrack\(/g
    let m
    while ((m = re.exec(text))) {
      let depth = 1
      let i = m.index + m[0].length
      while (i < text.length && depth > 0) {
        if (text[i] === '(') depth++
        else if (text[i] === ')') depth--
        i++
      }
      const args = text.slice(m.index + m[0].length, i - 1)
      // Comments that mention track() in prose are not calls.
      const line = text.slice(text.lastIndexOf('\n', m.index) + 1, m.index)
      if (/^\s*(\/\/|\*)/.test(line)) continue
      calls.push({ file: relative(SRC, file), args })
    }
  }
  return calls
}

const FORBIDDEN =
  /email|token|password|passwd|nonce|credential|secret|jwt|\bcode\b|authorizationCode|passkeyId|friendly_name|\bsession\b|user\.id|userId/i

describe('analytics privacy', () => {
  const calls = trackCalls()

  it('finds the calls it is meant to guard', () => {
    expect(calls.length).toBeGreaterThan(30)
    expect(calls.some((c) => c.file.includes('passkeys.js'))).toBe(true)
    expect(calls.some((c) => c.file.includes('socialSignIn.js'))).toBe(true)
  })

  it('names every event with a plain string', () => {
    for (const c of calls) expect(c.args, c.file).toMatch(/^\s*'[a-z_]+'/)
  })

  it('never sends an email, token, code or passkey detail', () => {
    for (const c of calls) {
      // String literals are fixed labels ('password' as a sign-in method is a
      // name, not a password), so only the code around them is checked.
      const props = c.args.replace(/^\s*'[a-z_]+'\s*,?/, '').replace(/'[^']*'/g, "''")
      expect(props, `${c.file}: track(${c.args})`).not.toMatch(FORBIDDEN)
    }
  })

  it('sends tip_closed with only which tip and how, never the row it pointed at', () => {
    const closes = calls.filter((c) => /^\s*'tip_closed'/.test(c.args))
    expect(closes.length).toBeGreaterThan(0)
    for (const c of closes) expect(c.args, c.file).toMatch(/^\s*'tip_closed',\s*\{\s*tip:\s*\w+,\s*how\s*\}\s*$/)
  })

  it('lists every event in the catalog', () => {
    const catalog = readFileSync(new URL('./analytics.js', import.meta.url), 'utf8')
    const names = new Set(calls.map((c) => /^\s*'([a-z_]+)'/.exec(c.args)?.[1]))
    for (const name of names) expect(catalog, name).toMatch(new RegExp(`//\\s+${name}\\s`))
  })
})
