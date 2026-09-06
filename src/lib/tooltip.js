// The attributes a tipped toolbar control carries (spec A22): the text is
// both the tooltip and the accessible name, the keys ride along as JSON for
// the chip. Pure, so the shape the tooltip layer parses is tested once.

/**
 * tipProps('Reset chart view', ['Alt', 'R']) →
 *   { 'data-tooltip': 'Reset chart view',
 *     'data-tooltip-hotkey': '{"keys":["Alt","R"]}',
 *     'aria-label': 'Reset chart view' }
 */
export function tipProps(text, keys) {
  return {
    'data-tooltip': text,
    'data-tooltip-hotkey': Array.isArray(keys) && keys.length ? JSON.stringify({ keys }) : undefined,
    'aria-label': text,
  }
}

/** The keys back out of the attribute, or null when there are none or it is malformed. */
export function parseHotkey(attr) {
  if (!attr) return null
  try {
    const keys = JSON.parse(attr)?.keys
    return Array.isArray(keys) && keys.length ? keys.map(String) : null
  } catch {
    return null
  }
}
