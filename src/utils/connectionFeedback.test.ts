import { describe, expect, it } from 'vitest'
import type { Edge, Node } from '@xyflow/react'
import { describeConnectionReject } from './connectionFeedback'

const nodes: Node[] = [
  { id: 'text-1', type: 'text', position: { x: 0, y: 0 }, data: {} },
  { id: 'image-1', type: 'image', position: { x: 200, y: 0 }, data: { modelId: 'seedream-4-5' } },
]

describe('describeConnectionReject', () => {
  it('returns null for valid text to image prompt connection', () => {
    const reason = describeConnectionReject(
      {
        source: 'text-1',
        target: 'image-1',
        sourceHandle: 'prompt',
        targetHandle: 'prompt',
      },
      nodes,
      [] as Edge[],
    )
    expect(reason).toBeNull()
  })

  it('returns reason for incompatible ports', () => {
    const reason = describeConnectionReject(
      {
        source: 'text-1',
        target: 'image-1',
        sourceHandle: 'prompt',
        targetHandle: 'reference1',
      },
      nodes,
      [] as Edge[],
    )
    expect(reason).toBeTruthy()
  })
})
