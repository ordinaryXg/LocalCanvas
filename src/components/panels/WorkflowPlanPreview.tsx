import type { WorkflowPlan } from '../../types/agent'
import { isValidWorkflowPlan } from '../../utils/parseWorkflowPlan'
import { summarizePlanWarnings } from '../../utils/agentPlanWarnings'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { useT } from '../../i18n'

interface WorkflowPlanPreviewProps {
  plan: WorkflowPlan
  warnings?: string[]
  onConfirm: () => void
  onDismiss: () => void
  confirmDisabled?: boolean
}

export function WorkflowPlanPreview({
  plan,
  warnings = [],
  onConfirm,
  onDismiss,
  confirmDisabled = false,
}: WorkflowPlanPreviewProps) {
  const t = useT()
  const openSettings = useEditorShellStore((s) => s.openSettings)
  const { blocking, degraded } = summarizePlanWarnings(warnings)

  if (!isValidWorkflowPlan(plan)) return null

  const executionLabel =
    plan.executionMode === 'auto'
      ? t('agent.executionAuto')
      : plan.executionMode === 'checkpoint'
        ? t('agent.executionCheckpoint')
        : t('agent.executionManual')

  return (
    <div className="mt-3 p-3 rounded-lg border border-accent/40 bg-bg-tertiary/80">
      <div className="text-xs font-medium text-accent mb-1">{t('agent.planTitle')}</div>
      <p className="text-[11px] text-text-primary mb-2">{plan.summary}</p>
      {warnings.length > 0 && (
        <ul className="text-[10px] text-warning space-y-0.5 mb-2 list-disc list-inside">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-text-muted mb-2">
        {t('agent.executionMode')}: {executionLabel}
        {degraded && !blocking ? ` · ${t('agent.executionDegraded')}` : ''}
      </p>
      <ol className="text-[10px] text-text-muted space-y-0.5 mb-3 list-decimal list-inside">
        {plan.nodes.map((n) => (
          <li key={n.tempId}>
            {n.label || n.type} ({n.tempId})
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        {blocking ? (
          <button
            type="button"
            onClick={() => openSettings({ tab: 'agent', focus: 'readiness' })}
            className="flex-1 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent-hover"
          >
            {t('agent.goToSettings')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="flex-1 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmDisabled ? t('agent.briefConfirmFirst') : t('agent.applyPlan')}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-1.5 text-xs rounded border border-border text-text-muted hover:text-text-primary"
        >
          {t('app.cancel')}
        </button>
      </div>
    </div>
  )
}
