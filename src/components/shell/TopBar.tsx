import { useMemo } from 'react'
import { ModeSwitcher } from './ModeSwitcher'
import { AccountMenu } from '../common/AccountMenu'
import { useProjectStore } from '../../stores/projectStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { useManualSave } from '../../hooks/useAutoSave'
import { useT } from '../../i18n'

interface TopBarProps {
  onBack: () => void
}

export function TopBar({ onBack }: TopBarProps) {
  const t = useT()
  const projectName = useProjectStore((s) => s.projectName)
  const isDirty = useProjectStore((s) => s.isDirty)
  const isSaving = useProjectStore((s) => s.isSaving)
  const saveError = useProjectStore((s) => s.saveError)
  const manualSave = useManualSave()
  const settingsOpen = useEditorShellStore((s) => s.settingsOpen)
  const setSettingsOpen = useEditorShellStore((s) => s.setSettingsOpen)
  const generatorDrawerOpen = useEditorShellStore((s) => s.generatorDrawerOpen)
  const generatingCount = useCanvasStore((s) => {
    let count = 0
    for (const n of s.nodes) {
      if (n.data?.isGenerating) count++
    }
    return count
  })
  const generatingProgressTotal = useCanvasStore((s) => {
    let sum = 0
    for (const n of s.nodes) {
      if (n.data?.isGenerating) sum += (n.data?.progress as number | undefined) ?? 0
    }
    return sum
  })

  const genBadge = useMemo(() => {
    if (generatorDrawerOpen || generatingCount === 0) return null
    return {
      count: generatingCount,
      pct: Math.round(generatingProgressTotal / generatingCount),
    }
  }, [generatorDrawerOpen, generatingCount, generatingProgressTotal])

  let saveLabel = t('toolbar.saved')
  let saveClass = 'text-[var(--studio-text-muted)]'
  if (saveError) {
    saveLabel = t('toolbar.saveFailed')
    saveClass = 'text-[var(--status-error)]'
  } else if (isSaving) {
    saveLabel = t('toolbar.saving')
    saveClass = 'text-[var(--studio-accent)]'
  } else if (isDirty) {
    saveLabel = t('toolbar.unsaved')
    saveClass = 'text-[var(--status-warning)]'
  }

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
        className={`text-xs shrink-0 ${saveClass}`}
        title={saveError || 'Ctrl+S 保存'}
      >
        {saveLabel}
      </button>

      {genBadge && (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--studio-accent-muted)] text-white shrink-0"
          title={`${genBadge.count} 个节点生成中`}
        >
          生成中 {genBadge.pct > 0 ? `${genBadge.pct}%` : '…'}
        </span>
      )}

      <div className="flex-1 min-w-0 flex justify-center">
        {settingsOpen ? (
          <span className="text-sm font-medium text-text-primary">⚙️ {t('settings.title')}</span>
        ) : (
          <ModeSwitcher />
        )}
      </div>

      <button
        type="button"
        onClick={() => setSettingsOpen(!settingsOpen)}
        className={`text-sm px-2 py-1 rounded ${
          settingsOpen
            ? 'text-accent bg-accent/15'
            : 'text-text-muted hover:text-white hover:bg-[var(--studio-surface-hover)]'
        }`}
        title={t('app.settings')}
      >
        ⚙
      </button>
      <AccountMenu />
    </header>
  )
}
