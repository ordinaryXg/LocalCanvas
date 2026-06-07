import { useEditorShellStore } from '../../stores/editorShellStore'

const SHORTCUTS = [
  { keys: 'Space（按住）', desc: '拖动画布（不可选中节点）' },
  { keys: 'Ctrl+S', desc: '保存项目' },
  { keys: 'Ctrl+Z', desc: '撤销' },
  { keys: 'Ctrl+Shift+Z', desc: '重做' },
  { keys: 'G', desc: '打开生成器（选中可生成节点）' },
  { keys: 'E', desc: '打开剪辑台（选中合成节点）' },
  { keys: 'Esc', desc: '关闭抽屉 / 返回画布模式' },
  { keys: '?', desc: '显示快捷键' },
  { keys: '/', desc: '画布命令面板' },
]

export function ShortcutsOverlay() {
  const open = useEditorShellStore((s) => s.shortcutsOpen)
  const setOpen = useEditorShellStore((s) => s.setShortcutsOpen)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="快捷键"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--studio-border)] bg-bg-secondary p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">快捷键</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-text-muted text-sm">
            ✕
          </button>
        </div>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex justify-between text-xs gap-4">
              <kbd className="font-mono text-text-primary">{s.keys}</kbd>
              <span className="text-text-muted text-right">{s.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
