import { describe, it, expect } from 'vitest'
import { classifyFilmTrack } from './filmTypeClassifier'
import { buildProductionPlan, isValidProductionPlan } from './buildProductionPlan'
import { applyProductionPlan } from './applyProductionPlan'
import { buildExpandProductionShotsPatch } from './expandProductionShots'
import { validateDurationBudget } from './shotSpecToScriptRows'
import { isSceneBoundaryShot } from './sceneCheckpoints'

describe('Studio smoke ST-01~03', () => {
  it('ST-01: 30s brand intent → studio checkpoint skeleton, no scene auto-run', () => {
    const track = classifyFilmTrack('30 秒咖啡品牌广告，竖屏，多镜头')
    expect(track.track).toBe('studio')

    const plan = buildProductionPlan({
      intent: '30 秒咖啡品牌广告，竖屏，多镜头',
      templateId: 'brand-spot-30s',
    })
    expect(plan.executionMode).toBe('checkpoint')
    expect(plan.workflow.executionMode).toBe('checkpoint')
    expect(isValidProductionPlan(plan)).toBe(true)
  })

  it('ST-02: duration over target 15% blocks apply', () => {
    const plan = buildProductionPlan({
      intent: '30 秒品牌',
      templateId: 'brand-spot-30s',
      shots: [
        { sequence: 1, description: 'A', prompt: 'A', durationSec: 20, camera: 'wide' },
        { sequence: 2, description: 'B', prompt: 'B', durationSec: 20, camera: 'wide' },
      ],
      brief: { targetDurationSec: 30 },
    })
    expect(validateDurationBudget(plan.shots, 30).level).toBe('block')
    const { error, nodes } = applyProductionPlan(plan)
    expect(error).toBeTruthy()
    expect(nodes.length).toBe(0)
  })

  it('ST-03: skeleton apply creates script rows and empty storyboard', () => {
    const plan = buildProductionPlan({
      intent: '30 秒品牌广告',
      templateId: 'brand-spot-30s',
    })
    const { nodes, error } = applyProductionPlan(plan)
    expect(error).toBeUndefined()
    const script = nodes.find((n) => n.type === 'script')
    const storyboard = nodes.find((n) => n.type === 'storyboard')
    expect((script?.data.scriptRows as unknown[])?.length).toBe(plan.shots.length)
    expect((storyboard?.data.frames as unknown[])?.length).toBe(0)
  })

  it('narrative expand tags scene boundary on last shot per scene', () => {
    const plan = buildProductionPlan({
      intent: '2 分钟叙事短片，三幕结构',
      templateId: 'narrative-short',
      brief: { targetDurationSec: 120 },
    })
    expect(plan.sceneCheckpoints).toBe(true)

    const { patch } = buildExpandProductionShotsPatch({
      plan,
      anchorNodeIds: ['sb-1'],
      maxShots: 6,
    })
    const videoNodes = patch.addNodes?.filter((n) => n.type === 'video') ?? []
    const boundaryNodes = videoNodes.filter((n) => n.data.sceneBoundaryEnd === true)
    expect(boundaryNodes.length).toBeGreaterThan(0)
    const lastBoundary = boundaryNodes[boundaryNodes.length - 1]
    const seq = lastBoundary.data.shotSequence as number
    expect(isSceneBoundaryShot(plan.shots.find((s) => s.sequence === seq)!, plan.shots)).toBe(true)
  })
})
