import { describe, it, expect } from 'vitest'
import { buildProductionPlan, isValidProductionPlan } from './buildProductionPlan'
import { applyProductionPlan } from './applyProductionPlan'

describe('buildProductionPlan', () => {
  it('builds brand-spot plan with skeleton nodes', () => {
    const plan = buildProductionPlan({
      intent: '30 秒咖啡品牌广告，电影感',
      templateId: 'brand-spot-30s',
    })
    expect(isValidProductionPlan(plan)).toBe(true)
    expect(plan.shots.length).toBeGreaterThanOrEqual(3)
    expect(plan.workflow.executionMode).toBe('checkpoint')
    expect(plan.workflow.nodes.some((n) => n.type === 'script')).toBe(true)
    expect(plan.workflow.nodes.some((n) => n.type === 'storyboard')).toBe(true)
    expect(plan.durationBudget.level).not.toBe('block')
  })
})

describe('applyProductionPlan', () => {
  it('creates script rows and empty storyboard frames', () => {
    const plan = buildProductionPlan({
      intent: '30 秒品牌广告',
      templateId: 'brand-spot-30s',
    })
    const { nodes, error } = applyProductionPlan(plan)
    expect(error).toBeUndefined()

    const script = nodes.find((n) => n.type === 'script')
    const storyboard = nodes.find((n) => n.type === 'storyboard')
    const compose = nodes.find((n) => n.type === 'compose')

    expect((script?.data.scriptRows as unknown[])?.length).toBe(plan.shots.length)
    expect((storyboard?.data.frames as unknown[])?.length).toBe(0)
    expect((compose?.data.clips as unknown[])?.length).toBeGreaterThan(0)
  })

  it('blocks apply when duration budget is block', () => {
    const plan = buildProductionPlan({
      intent: '30 秒品牌',
      templateId: 'brand-spot-30s',
      shots: [
        {
          sequence: 1,
          description: 'A',
          prompt: 'A',
          durationSec: 20,
          camera: 'wide',
        },
        {
          sequence: 2,
          description: 'B',
          prompt: 'B',
          durationSec: 20,
          camera: 'wide',
        },
      ],
      brief: { targetDurationSec: 30 },
    })
    expect(plan.durationBudget.level).toBe('block')
    const { error, nodes } = applyProductionPlan(plan)
    expect(error).toBeTruthy()
    expect(nodes.length).toBe(0)
  })
})
