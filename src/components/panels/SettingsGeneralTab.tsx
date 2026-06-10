import type { AppConfig } from '../../types/config'
import { useI18nStore, useT, type Locale } from '../../i18n'

interface SettingsGeneralTabProps {
  onStatus: (msg: { ok: boolean; text: string }) => void
}

export function SettingsGeneralTab({ onStatus }: SettingsGeneralTabProps) {
  const t = useT()
  const { locale, setLocale } = useI18nStore()

  return (
    <div className="space-y-4 max-w-lg">
      <div className="rounded-lg border border-[var(--studio-border)] p-3 space-y-3">
        <h3 className="text-sm font-medium text-text-primary">界面</h3>
        <button
          type="button"
          className="text-xs text-[var(--studio-accent)] hover:underline"
          onClick={() => {
            try {
              localStorage.removeItem('editorCoachDone')
            } catch {
              /* ignore */
            }
            onStatus({ ok: true, text: '已重置引导，下次打开编辑器将显示' })
          }}
        >
          重置界面引导
        </button>
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">{t('settings.language')}</label>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
        >
          <option value="zh-CN">简体中文</option>
          <option value="en-US">English</option>
        </select>
      </div>
    </div>
  )
}
