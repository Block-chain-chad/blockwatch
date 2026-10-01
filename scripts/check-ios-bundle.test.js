import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { findWebOnly } from './check-ios-bundle.mjs'

/*
 * The iPhone build's guard: it must see a Holdings string in any built file,
 * and it must actually run when started as a script. It once compared its
 * own address with a hand-built file:// string, which never matched on
 * Windows or under a folder with a space in its name, so it passed silently.
 * The second test runs the real script from such a folder.
 */

const SCRIPT = fileURLToPath(new URL('./check-ios-bundle.mjs', import.meta.url))

function bundle(files) {
  const dir = mkdtempSync(join(tmpdir(), 'ios bundle '))
  mkdirSync(join(dir, 'dist'))
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, 'dist', name), body)
  return dir
}

describe('check-ios-bundle', () => {
  it('finds a web-only string, and passes a clean build', () => {
    const dir = bundle({ 'a.js': 'const x = "Home"' })
    try {
      expect(findWebOnly(join(dir, 'dist'))).toEqual([])
      writeFileSync(join(dir, 'dist', 'b.js'), 'h2("Estimated value")')
      expect(findWebOnly(join(dir, 'dist'))).toEqual([{ file: join(dir, 'dist', 'b.js'), text: 'Estimated value' }])
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('fails the build when run as a script from a path with a space in it', () => {
    const dir = bundle({ 'index.js': 'h2("Estimated value")' })
    try {
      // A copy of the script inside the spaced folder, run the way build:ios runs it.
      const copy = join(dir, 'check-ios-bundle.mjs')
      writeFileSync(copy, readFileSync(SCRIPT, 'utf8'))
      const bad = spawnSync(process.execPath, [copy, join(dir, 'dist')], { encoding: 'utf8' })
      expect(bad.status).toBe(1)
      expect(bad.stderr).toContain('Estimated value')
      writeFileSync(join(dir, 'dist', 'index.js'), 'h2("Home")')
      const good = spawnSync(process.execPath, [copy, join(dir, 'dist')], { encoding: 'utf8' })
      expect(good.status).toBe(0)
      expect(good.stdout).toContain('iPhone bundle clean')
    } finally {
      rmSync(dir, { recursive: true })
    }
  })
})
