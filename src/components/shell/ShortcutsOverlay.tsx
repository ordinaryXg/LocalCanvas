import { useEditorShellStore } from '../../stores/editorShellStore'
import { useT } from '../../i18n'
import { KEYBOARD_SHORTCUTS } from '../../constants/keyboardShortcuts'

export function ShortcutsOverlay() {
  const open = useEditorShellStore((s) => s.shortcutsOpen)
  const setOpen = useEditorShellStore((s) => s.setShortcutsOpen)
  const t = useT()

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label={t('settings.tabShortcuts')}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--studio-border)] bg-bg-secondary p-4 shadow-xl max-h-[80vh] overflow-y-auto lc-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">{t('settings.tabShortcuts')}</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-text-muted text-sm">
            ✕
          </button>
        </div>
        <ul className="space-y-2">
          {KEYBOARD_SHORTCUTS.map((s) => {
            const desc = t(s.descKey) === s.descKey ? s.descFallback : t(s.descKey)
            return (
              <li key={s.id} className="flex justify-between text-xs gap-4">
                <kbd className="font-mono text-text-primary shrink-0">{s.keys}</kbd>
                <span className="text-text-muted text-right">{desc}</span>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-[10px] text-text-muted">{t('settings.shortcutsOverlayHint')}</p>
      </div>
    </div>
  )
}
