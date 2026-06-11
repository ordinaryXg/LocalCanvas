import { describe, it, expect } from 'vitest'
import { buildProductionPlan } from './buildProductionPlan'
import {
  applyRebalanceToProductionPlan,
  suggestDurationRebalance,
} from './durationRebalance'
import { validateDurationBudget } from './shotSpecToScriptRows'

describe('durationRebalance', () => {
  it('suggests trim/remove when over target', () => {
    const plan = buildProductionPlan({
      intent: '30 秒品牌',
      templateId: 'brand-spot-30s',
      shots: [
        { sequence: 1, description: 'A', prompt: 'A', durationSec: 12, camera: 'wide' },
        { sequence: 2, description: 'B', prompt: 'B', durationSec: 12, camera: 'wide' },
        { sequence: 3, description: 'C', prompt: 'C', durationSec: 12, camera: 'wide' },
      ],
      brief: { targetDurationSec: 30 },
    })
    expect(plan.durationBudget.level).toBe('block')
    const { suggestions, budgetAfter } = suggestDurationRebalance(
      plan.shots,
      plan.brief.targetDurationSec,
    )
    expect(suggestions.length).toBeGreaterThan(0)
    const updated = applyRebalanceToProductionPlan(plan)
    expect(updated.durationBudget.level).not.toBe('block')
    expect(validateDurationBudget(updated.shots, 30).level).toBe(budgetAfter.level)
  })

  it('returns empty suggestions when budget ok', () => {
    const plan = buildProductionPlan({
      intent: '30 秒品牌广告',
      templateId: 'brand-spot-30s',
    })
    const { suggestions } = suggestDurationRebalance(plan.shots, plan.brief.targetDurationSec)
    expect(suggestions).toEqual([])
  })
})
