import { describe, it, expect } from 'vitest'
import { legendStatus, delayTooltip, isStockDelayed, STOCK_DELAY_MINUTES } from './provenance'

describe('legendStatus', () => {
  it('reads the spec strings for the token leg', () => {
    expect(legendStatus('token', 'regular', 5)).toBe(
      '24/7 · One update every 30 seconds · Raydium by GeckoTerminal'
    )
    // The token trades whatever the market does.
    expect(legendStatus('token', 'closed', 500)).toBe(legendStatus('token', 'regular', 5))
  })

  it('reads the spec string for the stock leg after the close', () => {
    expect(legendStatus('stock', 'closed', 12)).toBe(
      'Market closed · Data is delayed · NASDAQ by Yahoo Finance'
    )
    expect(legendStatus('stock', 'post', 12)).toBe(
      'After hours · Data is delayed · NASDAQ by Yahoo Finance'
    )
    expect(legendStatus('stock', 'pre', 12)).toBe(
      'Pre-market · Data is delayed · NASDAQ by Yahoo Finance'
    )
  })

  it('states the cadence instead of a delay during regular hours with a fresh quote', () => {
    expect(legendStatus('stock', 'regular', 12)).toBe(
      'Market open · One update every 30 seconds · NASDAQ by Yahoo Finance'
    )
    expect(legendStatus('stock', 'regular', 600)).toBe(
      'Market open · Data is delayed · NASDAQ by Yahoo Finance'
    )
  })

  it('names the venue it is given', () => {
    expect(legendStatus('token', 'regular', 1, { venue: 'Orca' })).toContain('Orca by GeckoTerminal')
    expect(legendStatus('stock', 'closed', 1, { venue: 'NYSE' })).toContain('NYSE by Yahoo Finance')
  })

  it('treats an unknown session as closed', () => {
    expect(legendStatus('stock', undefined, 1)).toMatch(/^Market closed/)
  })
})

describe('isStockDelayed', () => {
  it('is delayed outside the regular session whatever the age', () => {
    expect(isStockDelayed('closed', 1)).toBe(true)
    expect(isStockDelayed('pre', 1)).toBe(true)
    expect(isStockDelayed('post', 1)).toBe(true)
  })

  it('is live inside the session within two refreshes, delayed otherwise', () => {
    expect(isStockDelayed('regular', 0)).toBe(false)
    expect(isStockDelayed('regular', 60)).toBe(false)
    expect(isStockDelayed('regular', 61)).toBe(true)
    expect(isStockDelayed('regular', null)).toBe(true)
    expect(isStockDelayed('regular', undefined)).toBe(true)
  })
})

describe('delayTooltip', () => {
  it('reads the spec string with the default delay', () => {
    expect(STOCK_DELAY_MINUTES).toBe(15)
    expect(delayTooltip()).toBe('Quotes are delayed by 15 min')
    expect(delayTooltip(20)).toBe('Quotes are delayed by 20 min')
  })
})
