import { describe, it, expect } from 'vitest'
import { classifyPlanWarning, summarizePlanWarnings } from './agentPlanWarnings'

describe('agentPlanWarnings', () => {
  it('classifies blocking when model missing', () => {
    expect(classifyPlanWarning('主图：未找到已接入的image模型')).toBe('blocking')
  })

  it('classifies degraded fallback picks', () => {
    expect(classifyPlanWarning('无完全匹配能力的模型，已选最接近的 Seedance')).toBe('degraded')
  })

  it('summarizes blocking state', () => {
    const summary = summarizePlanWarnings(['节点：未找到已接入的video模型'])
    expect(summary.blocking).toBe(true)
  })
})
