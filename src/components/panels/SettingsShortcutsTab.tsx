import { useT } from '../../i18n'
import {
  KEYBOARD_SHORTCUTS,
  SHORTCUT_CATEGORIES,
  SHORTCUT_CATEGORY_KEYS,
} from '../../constants/keyboardShortcuts'

export function SettingsShortcutsTab() {
  const t = useT()

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-xs text-text-muted">{t('settings.shortcutsHint')}</p>

      {SHORTCUT_CATEGORIES.map((category) => {
        const cat = SHORTCUT_CATEGORY_KEYS[category]
        const catLabel = t(cat.key) === cat.key ? cat.fallback : t(cat.key)
        const items = KEYBOARD_SHORTCUTS.filter((s) => s.category === category)
        if (items.length === 0) return null

        return (
          <section key={category}>
            <h3 className="text-sm font-medium text-text-primary mb-2">{catLabel}</h3>
            <ul className="rounded-lg border border-[var(--studio-border)] divide-y divide-border/60 overflow-hidden">
              {items.map((item) => {
                const desc =
                  t(item.descKey) === item.descKey ? item.descFallback : t(item.descKey)
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 px-3 py-2.5 bg-bg-tertiary/40"
                  >
                    <span className="text-xs text-text-secondary">{desc}</span>
                    <kbd className="shrink-0 font-mono text-[11px] text-text-primary bg-bg-primary px-2 py-1 rounded border border-border">
                      {item.keys}
                    </kbd>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <p className="text-[10px] text-text-muted">{t('settings.shortcutsCustomizeNote')}</p>
    </div>
  )
}
