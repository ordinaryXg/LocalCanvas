import { describe, it, expect } from 'vitest'
import { buildExpandProductionShotsPatch } from './expandProductionShots'
import { buildProductionPlan } from './buildProductionPlan'

describe('expandProductionShots', () => {
  it('builds patch with at most 6 shot chains', () => {
    const plan = buildProductionPlan({
      intent: '60 秒品牌广告，多镜头',
      templateId: 'brand-spot-30s',
      brief: { targetDurationSec: 60 },
    })
    const { patch, expandedCount } = buildExpandProductionShotsPatch({
      plan,
      anchorNodeIds: ['script-abc'],
      maxShots: 6,
    })
    expect(expandedCount).toBeLessThanOrEqual(6)
    expect(patch.addNodes?.length).toBe(expandedCount * 3)
    expect(patch.executionMode).toBe('checkpoint')
  })

  it('warns when ref-sheet shots lack reference image', () => {
    const plan = buildProductionPlan({
      intent: '产品演示 45 秒',
      templateId: 'product-demo',
    })
    const { warnings } = buildExpandProductionShotsPatch({
      plan,
      anchorNodeIds: ['script-abc'],
    })
    expect(warnings.length).toBeGreaterThan(0)
  })
})
