import { describe, it, expect } from 'vitest'
import { parseWorkflowPlan, WorkflowPlanParseError } from './parseWorkflowPlan'

describe('parseWorkflowPlan', () => {
  it('parses minimal valid plan', () => {
    const plan = parseWorkflowPlan(
      JSON.stringify({
        summary: '文生视频',
        nodes: [{ tempId: 't1', type: 'text', data: { inputContent: 'hello' } }],
        edges: [],
        executionMode: 'auto',
      }),
      'test intent',
    )
    expect(plan.nodes).toHaveLength(1)
    expect(plan.intent).toBe('test intent')
    expect(plan.executionMode).toBe('auto')
  })

  it('extracts JSON from markdown fence', () => {
    const plan = parseWorkflowPlan(
      '说明如下：\n```json\n{"summary":"x","nodes":[{"tempId":"a","type":"image","data":{}}],"edges":[]}\n```',
    )
    expect(plan.nodes[0].type).toBe('image')
  })

  it('throws on invalid type', () => {
    expect(() =>
      parseWorkflowPlan(JSON.stringify({ summary: 'x', nodes: [{ tempId: 'a', type: 'unknown', data: {} }], edges: [] })),
    ).toThrow(WorkflowPlanParseError)
  })
})
