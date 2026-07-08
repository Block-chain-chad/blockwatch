import { useFolders } from '../state/FoldersContext'

/* 5-second undo toast for destructive folder actions. Sits above the tab bar. */
export default function UndoToast() {
  const { toast, undo } = useFolders()
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] mx-auto flex max-w-md justify-center px-4">
      <div className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-xl bg-zinc-800 px-4 py-3 shadow-lg ring-1 ring-zinc-700/60">
        <span className="truncate text-sm text-zinc-200">{toast.label}</span>
        <button
          onClick={undo}
          className="shrink-0 text-sm font-semibold text-accent transition-opacity active:opacity-60"
        >
          Undo
        </button>
      </div>
    </div>
  )
}
