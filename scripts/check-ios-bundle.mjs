// Fails the iPhone build if a web-only feature reached its bundle.
//
// Holdings is web only in version one (holdings-build-brief-v3.md section
// 12). `npm run build:ios` builds with VITE_BUILD_TARGET=ios, which compiles
// it out (src/webOnly.js); this reads every file the build wrote and refuses
// to go on to `cap sync` if any of these strings is still in one.
//
// Usage: node scripts/check-ios-bundle.mjs [dist]

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const WEB_ONLY_STRINGS = [
  // The Holdings screen, its sheets and its sync. (The device keys may
  // stay: sign-out and account deletion clear them on every build.)
  'Estimated value',
  'Add a holding',
  'user_holdings',
  // The web venue list (the iPhone sheet has one approved sentence instead).
  'These exchanges say they do not serve people in the United States',
]

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

/** [{ file, text }] for every web-only string found under `dir`. */
export function findWebOnly(dir) {
  const hits = []
  for (const file of files(dir)) {
    if (!/\.(js|html|css|json)$/.test(file)) continue
    const body = readFileSync(file, 'utf8')
    for (const text of WEB_ONLY_STRINGS) if (body.includes(text)) hits.push({ file, text })
  }
  return hits
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] ?? 'dist'
  const hits = findWebOnly(dir)
  if (hits.length) {
    for (const h of hits) console.error(`web-only string "${h.text}" in ${h.file}`)
    console.error('The iPhone build must not carry Holdings. See src/webOnly.js.')
    process.exit(1)
  }
  console.log(`iPhone bundle clean: no web-only strings in ${dir}`)
}
