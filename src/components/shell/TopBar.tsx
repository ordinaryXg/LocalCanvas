import { ModeSwitcher } from './ModeSwitcher'
import { AccountMenu } from '../common/AccountMenu'
import { useProjectStore } from '../../stores/projectStore'
import { useManualSave } from '../../hooks/useAutoSave'
import { useT } from '../../i18n'

interface TopBarProps {
  onBack: () => void
  onOpenSettings: () => void
}

export function TopBar({ onBack, onOpenSettings }: TopBarProps) {
  const t = useT()
  const projectName = useProjectStore((s) => s.projectName)
  const isDirty = useProjectStore((s) => s.isDirty)
  const isSaving = useProjectStore((s) => s.isSaving)
  const manualSave = useManualSave()

  const saveLabel = isSaving ? '保存中…' : isDirty ? '未保存' : '已保存'

  return (
    <header
      className="shrink-0 flex items-center gap-3 px-3 border-b border-[var(--studio-border)] bg-bg-secondary"
      style={{ height: 'var(--space-topbar)' }}
    >
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-text-muted hover:text-white px-2 py-1 rounded hover:bg-[var(--studio-surface-hover)]"
        title={t('app.backToProjects')}
      >
        ←
      </button>
      <span className="text-sm font-semibold text-text-primary">LocalCanvas</span>
      <span className="text-text-muted">·</span>
      <span className="text-sm text-text-primary truncate max-w-[160px]" title={projectName}>
        {projectName}
      </span>
      <button
        type="button"
        onClick={() => void manualSave()}
        className={`text-xs shrink-0 ${isDirty ? 'text-amber-400' : 'text-text-muted'}`}
        title="Ctrl+S 保存"
      >
        {saveLabel}
      </button>

      <div className="flex-1 min-w-0 flex justify-center">
        <ModeSwitcher />
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="text-sm text-text-muted hover:text-white px-2 py-1 rounded"
        title={t('app.settings')}
      >
        ⚙
      </button>
      <AccountMenu />
    </header>
  )
}
