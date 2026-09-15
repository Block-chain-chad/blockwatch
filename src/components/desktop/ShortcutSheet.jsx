import Sheet, { SheetTitle } from '../Sheet'
import { shortcutRows, isMacPlatform } from '../../lib/desktopKeys'
import { KeyChip } from './Tooltip'

/*
 * The Ctrl+/ list (spec A14, §6.10): every desktop shortcut, one row each,
 * in a Sheet — a centred dialog at this width. The rows come from
 * lib/desktopKeys.js so the sheet, the tooltips and the key map cannot
 * disagree; the modifier reads ⌘ on a Mac.
 */
export default function ShortcutSheet({
  onClose,
  rows = shortcutRows(isMacPlatform()),
  intro = 'Anywhere on the desktop, outside a text field. Any letter starts a search.',
  footer = null,
}) {
  return (
    <Sheet onClose={onClose} pad={5}>
      <SheetTitle className="t-title text-zinc-100">Keyboard shortcuts</SheetTitle>
      <p className="t-caption mt-1 text-zinc-500">{intro}</p>
      <dl className="mt-4 divide-y divide-zinc-900">
        {rows.map((r) => (
          <div key={r.action} className="flex items-center justify-between gap-4 py-2">
            <dt className="t-label text-zinc-300">{r.action}</dt>
            <dd className="flex shrink-0 items-center gap-1">
              {r.keys.map((k) => (
                <KeyChip key={k} keys={[k]} />
              ))}
            </dd>
          </div>
        ))}
      </dl>
      {footer}
    </Sheet>
  )
}
