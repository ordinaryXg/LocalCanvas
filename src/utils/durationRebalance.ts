import type { DurationBudgetResult, ProductionPlan, ShotSpec } from '../types/agent'
import { clampShotDuration, validateDurationBudget } from './shotSpecToScriptRows'
import { buildProductionMeta, shotSpecsToScriptRows } from './shotSpecToScriptRows'

export interface DurationRebalanceSuggestion {
  id: string
  kind: 'trim' | 'remove'
  shotSequence: number
  label: string
  savesSec: number
}

function minDurationForShot(shot: ShotSpec): number {
  return shot.productionMode === 'flf' ? 3 : 1
}

/** 迭代缩短/删镜，直到时长预算 ok 或 warn */
export function rebalanceShotsToTarget(shots: ShotSpec[], targetSec: number): ShotSpec[] {
  let next = shots.map((s) => ({ ...s }))
  let budget: DurationBudgetResult = validateDurationBudget(next, targetSec)

  while (budget.level === 'block' && next.length > 0) {
    const trimIdx = next.reduce(
      (best, s, i) => (s.durationSec > next[best].durationSec ? i : best),
      0,
    )
    const shot = next[trimIdx]
    const minDur = minDurationForShot(shot)
    if (shot.durationSec > minDur) {
      next[trimIdx] = { ...shot, durationSec: shot.durationSec - 1 }
    } else if (next.length > 1) {
      next = next
        .filter((_, i) => i !== trimIdx)
        .map((s, i) => ({ ...s, sequence: i + 1 }))
    } else {
      break
    }
    budget = validateDurationBudget(next, targetSec)
  }

  return next
}

export function buildDurationRebalanceSuggestions(
  before: ShotSpec[],
  after: ShotSpec[],
): DurationRebalanceSuggestion[] {
  const suggestions: DurationRebalanceSuggestion[] = []
  const afterBySeq = new Map(after.map((s) => [s.sequence, s]))

  for (const shot of before) {
    const updated = afterBySeq.get(shot.sequence)
    if (!updated) {
      suggestions.push({
        id: `remove-${shot.sequence}`,
        kind: 'remove',
        shotSequence: shot.sequence,
        label: `删除镜 ${shot.sequence}（-${clampShotDuration(shot.durationSec, shot.productionMode)}s）`,
        savesSec: clampShotDuration(shot.durationSec, shot.productionMode),
      })
      continue
    }
    const from = clampShotDuration(shot.durationSec, shot.productionMode)
    const to = clampShotDuration(updated.durationSec, updated.productionMode)
    if (to < from) {
      suggestions.push({
        id: `trim-${shot.sequence}`,
        kind: 'trim',
        shotSequence: shot.sequence,
        label: `镜 ${shot.sequence} 缩短 ${from - to}s（${from}s → ${to}s）`,
        savesSec: from - to,
      })
    }
  }

  return suggestions
}

export function suggestDurationRebalance(
  shots: ShotSpec[],
  targetSec: number,
): {
  suggestions: DurationRebalanceSuggestion[]
  rebalancedShots: ShotSpec[]
  budgetAfter: DurationBudgetResult
} {
  const budgetBefore = validateDurationBudget(shots, targetSec)
  if (budgetBefore.level === 'ok' || budgetBefore.deltaSec <= 0) {
    return { suggestions: [], rebalancedShots: shots, budgetAfter: budgetBefore }
  }

  const rebalancedShots = rebalanceShotsToTarget(shots, targetSec)
  const suggestions = buildDurationRebalanceSuggestions(shots, rebalancedShots)
  const budgetAfter = validateDurationBudget(rebalancedShots, targetSec)
  return { suggestions, rebalancedShots, budgetAfter }
}

export function applyRebalanceToProductionPlan(plan: ProductionPlan): ProductionPlan {
  const { rebalancedShots, budgetAfter } = suggestDurationRebalance(
    plan.shots,
    plan.brief.targetDurationSec,
  )
  if (rebalancedShots === plan.shots) return plan

  const scriptRows = shotSpecsToScriptRows(rebalancedShots)
  const productionMeta = buildProductionMeta(rebalancedShots, plan.brief, {
    templateId: plan.templateId,
    at: new Date().toISOString(),
  })

  const nodes = plan.workflow.nodes.map((node) => {
    if (node.type !== 'script') return node
    return {
      ...node,
      data: {
        ...node.data,
        scriptRows,
        productionMeta,
      },
    }
  })

  return {
    ...plan,
    shots: rebalancedShots,
    durationBudget: budgetAfter,
    workflow: {
      ...plan.workflow,
      nodes,
    },
  }
}
