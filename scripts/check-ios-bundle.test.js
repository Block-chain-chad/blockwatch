import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findWebOnly } from './check-ios-bundle.mjs'

/* The iPhone build's guard: it must see a Holdings string in any built file. */
describe('check-ios-bundle', () => {
  it('finds a web-only string, and passes a clean build', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ios-bundle-'))
    try {
      writeFileSync(join(dir, 'a.js'), 'const x = "Home"')
      expect(findWebOnly(dir)).toEqual([])
      writeFileSync(join(dir, 'b.js'), 'h2("Estimated value")')
      expect(findWebOnly(dir)).toEqual([{ file: join(dir, 'b.js'), text: 'Estimated value' }])
    } finally {
      rmSync(dir, { recursive: true })
    }
  })
})
