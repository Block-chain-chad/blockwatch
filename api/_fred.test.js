import { describe, it, expect } from 'vitest'
import { parseFredCsv } from './_fred.js'

/*
 * The failure that matters here is silent: a missing observation parsed as
 * zero renders a 0.00% thirty-year yield in the same confident type as a real
 * one. Empty fields and the legacy "." marker must both be skipped, and each
 * series must be walked back independently — a holiday can close one tenor
 * and not another, so the last row is not reliably the last observation.
 */

const IDS = ['DGS2', 'DGS10', 'DGS30']

const csv = `observation_date,DGS2,DGS10,DGS30
2026-08-14,4.17,4.68,5.25
2026-08-17,4.19,4.72,5.31
2026-08-18,4.19,4.71,5.28
2026-08-19,4.19,4.65,5.19`

describe('parseFredCsv', () => {
  it('reads the latest value for each maturity', () => {
    const { series } = parseFredCsv(csv, IDS)
    expect(series.DGS2.value).toBe(4.19)
    expect(series.DGS10.value).toBe(4.65)
    expect(series.DGS30.value).toBe(5.19)
  })

  it('computes change against the prior observation', () => {
    const { series } = parseFredCsv(csv, IDS)
    expect(series.DGS30.change).toBe(-0.09)
    expect(series.DGS10.change).toBe(-0.06)
    expect(series.DGS2.change).toBe(0)
  })

  it('reports the newest date across series as asOf', () => {
    expect(parseFredCsv(csv, IDS).asOf).toBe('2026-08-19')
  })

  it('skips empty fields rather than reading them as zero', () => {
    const gappy = `observation_date,DGS2,DGS30
2026-08-17,4.19,5.31
2026-08-18,4.19,
2026-08-19,4.20,`
    const { series } = parseFredCsv(gappy, ['DGS2', 'DGS30'])
    expect(series.DGS30.value).toBe(5.31)
    expect(series.DGS30.at).toBe('2026-08-17')
    expect(series.DGS2.value).toBe(4.2)
  })

  it('skips the legacy "." missing marker too', () => {
    const dotted = `observation_date,DGS30
2026-08-18,5.28
2026-08-19,.`
    expect(parseFredCsv(dotted, ['DGS30']).series.DGS30.value).toBe(5.28)
  })

  it('walks each series back independently', () => {
    // DGS10's newest reading is a day older than DGS2's.
    const uneven = `observation_date,DGS2,DGS10
2026-08-17,4.19,4.72
2026-08-18,4.19,4.71
2026-08-19,4.25,`
    const { series, asOf } = parseFredCsv(uneven, ['DGS2', 'DGS10'])
    expect(series.DGS2.at).toBe('2026-08-19')
    expect(series.DGS10.at).toBe('2026-08-18')
    expect(series.DGS10.change).toBe(-0.01)
    expect(asOf).toBe('2026-08-19')
  })

  it('leaves change null when there is only one observation', () => {
    const single = `observation_date,DGS30
2026-08-19,5.19`
    expect(parseFredCsv(single, ['DGS30']).series.DGS30.change).toBeNull()
  })

  it('survives junk without throwing', () => {
    expect(parseFredCsv('', IDS)).toEqual({ asOf: null, series: {} })
    expect(parseFredCsv(null, IDS)).toEqual({ asOf: null, series: {} })
    expect(parseFredCsv('observation_date,DGS2', IDS)).toEqual({ asOf: null, series: {} })
    // A requested series absent from the header is simply omitted.
    expect(parseFredCsv(csv, ['DGS7']).series).toEqual({})
  })
})
