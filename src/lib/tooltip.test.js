import { describe, it, expect } from 'vitest'
import { tipProps, parseHotkey } from './tooltip'

describe('tipProps', () => {
  it('doubles the text as the accessible name and carries the keys as JSON', () => {
    expect(tipProps('Reset chart view', ['Alt', 'R'])).toEqual({
      'data-tooltip': 'Reset chart view',
      'data-tooltip-hotkey': '{"keys":["Alt","R"]}',
      'aria-label': 'Reset chart view',
    })
  })

  it('omits the hotkey attribute without keys', () => {
    expect(tipProps('Candles')['data-tooltip-hotkey']).toBeUndefined()
    expect(tipProps('Candles', [])['data-tooltip-hotkey']).toBeUndefined()
  })
})

describe('parseHotkey', () => {
  it('round-trips what tipProps wrote', () => {
    expect(parseHotkey(tipProps('x', ['Shift', 'F'])['data-tooltip-hotkey'])).toEqual(['Shift', 'F'])
  })

  it('is null for nothing, malformed JSON or the wrong shape', () => {
    expect(parseHotkey(null)).toBeNull()
    expect(parseHotkey('')).toBeNull()
    expect(parseHotkey('{keys:')).toBeNull()
    expect(parseHotkey('{"keys":[]}')).toBeNull()
    expect(parseHotkey('{"keys":"R"}')).toBeNull()
  })
})
