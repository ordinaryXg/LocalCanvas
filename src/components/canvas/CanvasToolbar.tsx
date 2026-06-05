import { useProjectStore } from '../../stores/projectStore'
import { useI18nStore, useT } from '../../i18n'

export function CanvasToolbar() {
  const t = useT()
  const locale = useI18nStore((s) => s.locale)
  const { projectName, isSaving, lastSavedAt, isDirty } = useProjectStore()

  const timeLocale = locale === 'en-US' ? 'en-US' : 'zh-CN'

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-bg-secondary/90 backdrop-blur px-4 py-1.5 rounded-full border border-border text-xs text-text-primary z-10">
      <span className="text-white font-medium">{projectName || t('toolbar.unnamed')}</span>
      <span className="text-text-muted">|</span>
      {isSaving ? (
        <span className="text-accent">{t('toolbar.saving')}</span>
      ) : isDirty ? (
        <span className="text-amber-400">{t('toolbar.unsaved')}</span>
      ) : lastSavedAt ? (
        <span>
          {t('toolbar.saved')} {new Date(lastSavedAt).toLocaleTimeString(timeLocale)}
        </span>
      ) : (
        <span>{t('toolbar.ready')}</span>
      )}
    </div>
  )
}
