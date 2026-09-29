import { describe, it, expect } from 'vitest'
import { chartTitle, screenTitle, signedPct, titlePrice, DEFAULT_TITLE, meterTitle, meterHeadline, boardTitle } from './pageTitle'

const UP = '▲'
const DOWN = '▼'
const MINUS = '−'

describe('chartTitle', () => {
  it('is the quote in Candles mode: ticker, price, triangle, signed change', () => {
    expect(chartTitle({ ticker: 'NVDAx', price: 12.34, changePct: 0.65 })).toBe(
      `NVDAx 12.34 ${UP} +0.65%`
    )
    expect(chartTitle({ ticker: 'NVDAx', price: 12.34, changePct: -1.2 })).toBe(
      `NVDAx 12.34 ${DOWN} ${MINUS}1.20%`
    )
  })

  it('uses a real minus and a real triangle, never a hyphen or ascii art', () => {
    const t = chartTitle({ ticker: 'TSLAx', price: 200, changePct: -0.5 })
    expect(t).not.toContain('-')
    expect(t).toContain(MINUS)
    expect(t).toContain(DOWN)
  })

  it('drops the triangle on a flat reading', () => {
    expect(chartTitle({ ticker: 'NVDAx', price: 12.34, changePct: 0 })).toBe('NVDAx 12.34 0%')
  })

  it('is the gap in Gap mode, triangle after the number', () => {
    expect(chartTitle({ ticker: 'NVDAx', mode: 'gap', gapPct: 0.42, price: 12.34 })).toBe(
      `NVDAx gap +0.42% ${UP}`
    )
    expect(chartTitle({ ticker: 'NVDAx', mode: 'gap', gapPct: -0.42 })).toBe(
      `NVDAx gap ${MINUS}0.42% ${DOWN}`
    )
  })

  it('falls back to the price form in Gap mode without a gap (NAV-based)', () => {
    expect(chartTitle({ ticker: 'TBILL', mode: 'gap', gapPct: null, price: 1.0021, changePct: 0.01 })).toBe(
      `TBILL 1.00 ${UP} +0.01%`
    )
  })

  it('is the ticker alone before the first quote', () => {
    expect(chartTitle({ ticker: 'NVDAx' })).toBe('NVDAx')
    expect(chartTitle({ ticker: 'NVDAx', price: null, changePct: null })).toBe('NVDAx')
  })

  it('shows the price without a change when only the change is missing', () => {
    expect(chartTitle({ ticker: 'NVDAx', price: 12.34 })).toBe('NVDAx 12.34')
  })

  it('never appends the product name', () => {
    expect(chartTitle({ ticker: 'NVDAx', price: 12.34, changePct: 0.65 })).not.toContain('OnStock')
  })

  it('is the default title with no ticker', () => {
    expect(chartTitle({})).toBe(DEFAULT_TITLE)
    expect(chartTitle()).toBe(DEFAULT_TITLE)
  })
})

describe('titlePrice / signedPct', () => {
  it('formats two decimals above a dollar and more below', () => {
    expect(titlePrice(208.19)).toBe('208.19')
    expect(titlePrice(0.0421)).toBe('0.042')
    expect(titlePrice(0)).toBe('0.00')
    expect(titlePrice(NaN)).toBeNull()
  })

  it('signs percentages with + and a true minus', () => {
    expect(signedPct(0.65)).toBe('+0.65%')
    expect(signedPct(-0.65)).toBe(`${MINUS}0.65%`)
    expect(signedPct(0)).toBe('0%')
    expect(signedPct(undefined)).toBeNull()
  })
})

describe('screenTitle', () => {
  it('names the takeover screens with the product suffix', () => {
    expect(screenTitle('screener')).toBe('Gaps · OnStock')
    expect(screenTitle('folders')).toBe('Folders · OnStock')
    expect(screenTitle('news')).toBe('News · OnStock')
    expect(screenTitle('trade')).toBe('Trade · OnStock')
  })

  it('falls back to the default for home or an unknown tab', () => {
    expect(screenTitle('home')).toBe(DEFAULT_TITLE)
    expect(screenTitle(undefined)).toBe(DEFAULT_TITLE)
  })
})

describe('meterTitle / boardTitle', () => {
  it('names the wrapper and its gap with the product, no triangle', () => {
    expect(meterTitle({ ticker: 'NVDAx', gapPct: 0.09 })).toBe('NVDAx +0.09% gap · OnStock')
    expect(meterTitle({ ticker: 'NVDAx', gapPct: -2.14 })).toBe(`NVDAx ${MINUS}2.14% gap · OnStock`)
    expect(meterTitle({ ticker: 'NVDAx', gapPct: 0.09 })).not.toContain(UP)
    expect(meterTitle({ ticker: 'TBILL', gapPct: null })).toBe('TBILL · OnStock')
    expect(meterTitle({})).toBe(boardTitle())
    expect(boardTitle()).toBe('Board · OnStock')
  })
})

describe('meterHeadline', () => {
  it('is the wrapper and its gap, without the product', () => {
    expect(meterHeadline({ ticker: 'NVDAx', gapPct: 1.42 })).toBe('NVDAx +1.42% gap')
    expect(meterHeadline({ ticker: 'NVDAx', gapPct: -0.31 })).toBe('NVDAx −0.31% gap')
    expect(meterHeadline({ ticker: 'NVDAx', gapPct: 0 })).toBe('NVDAx 0% gap')
    expect(meterHeadline({ ticker: 'NVDAx' })).toBe('NVDAx')
    expect(meterHeadline({})).toBeNull()
  })

  it('is what meterTitle says before the product', () => {
    expect(meterTitle({ ticker: 'NVDAx', gapPct: 1.42 })).toBe('NVDAx +1.42% gap · OnStock')
    expect(meterTitle({ ticker: 'NVDAx' })).toBe('NVDAx · OnStock')
    expect(meterTitle({})).toBe('Board · OnStock')
  })
})

describe('titles while the share leg is a close', () => {
  const closed = { tag: 'Market closed', vs: 'vs Friday’s close' }

  it('names the close in the Meter title', () => {
    expect(meterTitle({ ticker: 'NVDAx', gapPct: 1.42, closed })).toBe(
      'NVDAx +1.42% gap vs Friday’s close · Market closed · OnStock'
    )
    expect(meterTitle({ ticker: 'NVDAx', gapPct: null, closed })).toBe('NVDAx · OnStock')
  })

  it('names the close in the chart title in Gap mode only', () => {
    expect(chartTitle({ ticker: 'NVDAx', mode: 'gap', gapPct: 1.42, closed })).toContain('vs Friday’s close · Market closed')
    expect(chartTitle({ ticker: 'NVDAx', price: 12.34, changePct: 0.65, closed })).not.toContain('close')
  })
})
