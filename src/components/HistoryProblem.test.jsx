import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import HistoryProblem from './HistoryProblem'

const NOW = 1_000_000
afterEach(() => vi.restoreAllMocks())

describe('HistoryProblem', () => {
  it('says why the history is missing and holds the retry until the cooldown ends', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW)
    const html = renderToStaticMarkup(<HistoryProblem problem={{ kind: 'busy', retryAt: NOW + 30_000 }} onRetry={() => {}} />)
    expect(html).toContain('is busy right now')
    expect(html).toContain('Try again in 30 s')
    expect(html).toMatch(/<button[^>]* disabled=""/)
  })

  it('offers an enabled retry once the wait is over', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW)
    const html = renderToStaticMarkup(<HistoryProblem problem={{ kind: 'unreachable', retryAt: NOW - 1 }} onRetry={() => {}} />)
    expect(html).toContain('Try again')
    expect(html).not.toMatch(/<button[^>]* disabled=""/)
  })

  it('offers no retry for a token the source does not have', () => {
    const html = renderToStaticMarkup(<HistoryProblem problem={{ kind: 'missing', retryAt: null }} onRetry={() => {}} />)
    expect(html).toContain('no history for this token yet')
    expect(html).not.toContain('<button')
  })
})
