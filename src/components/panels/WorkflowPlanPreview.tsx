import type { WorkflowPlan } from '../../types/agent'
import { isValidWorkflowPlan } from '../../utils/parseWorkflowPlan'
import { useT } from '../../i18n'

interface WorkflowPlanPreviewProps {
  plan: WorkflowPlan
  onConfirm: () => void
  onDismiss: () => void
}

export function WorkflowPlanPreview({ plan, onConfirm, onDismiss }: WorkflowPlanPreviewProps) {
  const t = useT()

  if (!isValidWorkflowPlan(plan)) return null

  return (
    <div className="mt-3 p-3 rounded-lg border border-accent/40 bg-bg-tertiary/80">
      <div className="text-xs font-medium text-accent mb-1">{t('agent.planTitle')}</div>
      <p className="text-[11px] text-text-primary mb-2">{plan.summary}</p>
      <ol className="text-[10px] text-text-muted space-y-0.5 mb-3 list-decimal list-inside">
        {plan.nodes.map((n) => (
          <li key={n.tempId}>
            {n.label || n.type} ({n.tempId})
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent-hover"
        >
          {t('agent.applyPlan')}
        </button>
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
