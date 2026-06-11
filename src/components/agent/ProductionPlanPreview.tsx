import type { ProductionPlan } from '../../types/agent'
import { isValidProductionPlan } from '../../utils/buildProductionPlan'
import { summarizePlanWarnings } from '../../utils/agentPlanWarnings'
import { suggestDurationRebalance, applyRebalanceToProductionPlan } from '../../utils/durationRebalance'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { useT } from '../../i18n'

interface ProductionPlanPreviewProps {
  plan: ProductionPlan
  warnings?: string[]
  onConfirm: () => void
  onDismiss: () => void
  onRebalance?: (plan: ProductionPlan) => void
  confirmDisabled?: boolean
}

export function ProductionPlanPreview({
  plan,
  warnings = [],
  onConfirm,
  onDismiss,
  onRebalance,
  confirmDisabled = false,
}: ProductionPlanPreviewProps) {
  const t = useT()
  const openSettings = useEditorShellStore((s) => s.openSettings)
  const { blocking, degraded } = summarizePlanWarnings(warnings)

  if (!isValidProductionPlan(plan)) return null

  const budget = plan.durationBudget
  const budgetBlocked = budget.level === 'block'
  const budgetWarn = budget.level === 'warn'
  const targetSec = plan.brief?.targetDurationSec ?? 30
  const rebalance = suggestDurationRebalance(plan.shots, targetSec)
  const disabled = confirmDisabled || budgetBlocked || blocking

  return (
    <div className="mt-3 p-3 rounded-lg border border-accent/40 bg-bg-tertiary/80">
      <div className="text-xs font-medium text-accent mb-1">{t('agent.productionPlanTitle')}</div>
      <p className="text-[11px] text-text-primary mb-1">{plan.summary}</p>
      <p className="text-[10px] text-text-muted mb-2">
        {plan.brief.filmType} · {plan.brief.targetDurationSec}s · {plan.brief.aspectRatio} ·{' '}
        {plan.shots.length} {t('agent.productionPlanShots')}
      </p>
      {budgetWarn && (
        <p className="text-[10px] text-warning mb-2">
          {t('agent.productionPlanDurationWarn')
            .replace('{{sum}}', String(budget.sumSec))
            .replace('{{target}}', String(budget.targetSec))}
        </p>
      )}
      {budgetBlocked && (
        <p className="text-[10px] text-error mb-2">
          {t('agent.productionPlanDurationBlock')
            .replace('{{sum}}', String(budget.sumSec))
            .replace('{{target}}', String(budget.targetSec))}
        </p>
      )}
      {rebalance.suggestions.length > 0 && onRebalance && (
        <div className="mb-2 rounded border border-warning/30 bg-warning/5 p-2 space-y-1">
          <p className="text-[10px] font-medium text-warning">{t('agent.rebalanceTitle')}</p>
          <ul className="text-[10px] text-text-muted space-y-0.5 list-disc list-inside">
            {rebalance.suggestions.map((s) => (
              <li key={s.id}>{s.label}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onRebalance(applyRebalanceToProductionPlan(plan))}
            className="text-[10px] px-2 py-0.5 rounded border border-warning/40 text-warning hover:bg-warning/10"
          >
            {t('agent.rebalanceApply')}
          </button>
        </div>
      )}
      {warnings.length > 0 && (
        <ul className="text-[10px] text-warning space-y-0.5 mb-2 list-disc list-inside">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-text-muted mb-2">
        {t('agent.executionMode')}: {t('agent.executionCheckpoint')}
        {degraded && !blocking ? ` · ${t('agent.executionDegraded')}` : ''}
      </p>
      <ol className="text-[10px] text-text-muted space-y-0.5 mb-3 list-decimal list-inside">
        {plan.workflow.nodes.map((n) => (
          <li key={n.tempId}>
            {n.label || n.type} ({n.tempId})
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onConfirm()
          }}
          disabled={disabled}
          className="flex-1 min-w-[120px] py-1.5 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {confirmDisabled
            ? t('agent.briefConfirmFirst')
            : budgetBlocked
              ? t('agent.productionPlanAdjustShots')
              : t('agent.applyProductionPlan')}
        </button>
        {blocking && (
          <button
            type="button"
            onClick={() => openSettings({ tab: 'agent', focus: 'readiness' })}
            className="px-3 py-1.5 text-xs rounded border border-accent/40 text-accent hover:bg-accent/10"
          >
            {t('agent.goToSettings')}
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
