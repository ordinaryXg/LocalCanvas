import { useEditorShellStore, type EditorMode } from '../../stores/editorShellStore'

const MODES: { id: EditorMode; label: string }[] = [
  { id: 'canvas', label: '画布' },
  { id: 'workbench', label: '工作台' },
]

export function ModeSwitcher() {
  const mode = useEditorShellStore((s) => s.mode)
  const setMode = useEditorShellStore((s) => s.setMode)

  return (
    <div
      role="tablist"
      aria-label="编辑器模式"
      className="inline-flex rounded-full bg-zinc-800/80 p-1 gap-0.5"
    >
      {MODES.map((m) => {
        const active = mode === m.id
        const activeClass =
          m.id === 'canvas' ? 'bg-[var(--mode-canvas)]' : 'bg-[var(--mode-generate)]'
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setMode(m.id)}
            className={`px-3 py-1 text-sm rounded-full transition ${
              active
                ? `${activeClass} text-white font-medium shadow-sm`
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
