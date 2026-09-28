import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Vercel's Hobby plan refuses a deployment with more than 12 serverless
// functions. Every file in api/ counts unless its name starts with an
// underscore or .vercelignore leaves it out, so check the count here, before
// a push fails in production.
const HOBBY_LIMIT = 12
const apiDir = join(process.cwd(), 'api')

function deployedFunctions() {
  return readdirSync(apiDir, { recursive: true })
    .map(String)
    .filter((f) => /\.(c|m)?(j|t)s$/.test(f))
    .filter((f) => !f.split(/[\\/]/).some((part) => part.startsWith('_')))
    .filter((f) => !/\.test\.(c|m)?(j|t)s$/.test(f))
}

describe('Vercel function limit', () => {
  it('keeps test files out of the deployment', () => {
    const ignore = readFileSync(join(process.cwd(), '.vercelignore'), 'utf8')
    expect(ignore).toMatch(/^api\/\*\*\/\*\.test\.js$/m)
  })

  it(`deploys no more than ${HOBBY_LIMIT} functions`, () => {
    const fns = deployedFunctions()
    expect(fns.length, `api functions: ${fns.join(', ')}`).toBeLessThanOrEqual(HOBBY_LIMIT)
  })
})
