import { describe, it, expect } from 'vitest'
import type { Node } from '@xyflow/react'
import { computePhaseRail } from './agentPhaseState'

const node = (type: string, data?: Record<string, unknown>): Node =>
  ({ id: type, type, position: { x: 0, y: 0 }, data: data ?? {} }) as Node

describe('agentPhaseState', () => {
  it('marks brief active before confirmation', () => {
    const phases = computePhaseRail({
      briefConfirmed: false,
      hasShotPreview: false,
      handoff: null,
      nodes: [],
    })
    expect(phases.find((p) => p.id === 'brief')?.status).toBe('active')
    expect(phases.find((p) => p.id === 'shots')?.status).toBe('pending')
  })

  it('marks shots done after brief and shot preview', () => {
    const phases = computePhaseRail({
      briefConfirmed: true,
      hasShotPreview: true,
      handoff: { step: 'script', scriptNodeId: 's1', collapsed: false },
      nodes: [node('script')],
    })
    expect(phases.find((p) => p.id === 'brief')?.status).toBe('done')
    expect(phases.find((p) => p.id === 'shots')?.status).toBe('done')
    expect(phases.find((p) => p.id === 'script')?.status).toBe('active')
  })
})
