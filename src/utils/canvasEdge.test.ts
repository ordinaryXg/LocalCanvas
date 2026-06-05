import { describe, it, expect } from 'vitest'
import { addEdge } from '@xyflow/react'
import { connectionToEdgeParams, createCanvasEdge, ensureEdgeIds } from './canvasEdge'

describe('canvasEdge', () => {
  it('addEdge generates ids when connection params omit id', () => {
    const edges = addEdge(
      connectionToEdgeParams({
        source: 't1',
        target: 'i1',
        sourceHandle: 'prompt',
        targetHandle: 'prompt',
      }),
      [],
    )
    expect(edges[0].id).toBeTruthy()

    const fanOut = addEdge(
      connectionToEdgeParams({
        source: 't1',
        target: 'v1',
        sourceHandle: 'prompt',
        targetHandle: 'prompt',
      }),
      edges,
    )
    expect(fanOut).toHaveLength(2)
    expect(fanOut[1].id).toBeTruthy()
    expect(fanOut[0].id).not.toBe(fanOut[1].id)
  })

  it('createCanvasEdge always assigns an id', () => {
    const edge = createCanvasEdge({ source: 'a', target: 'b' })
    expect(edge.id).toMatch(/^edge-/)
  })

  it('ensureEdgeIds fills missing ids', () => {
    const fixed = ensureEdgeIds([{ source: 'a', target: 'b' } as never])
    expect(fixed[0].id).toMatch(/^edge-/)
  })

  it('connectionToEdgeParams applies warn style for dashed_warn', () => {
    const params = connectionToEdgeParams(
      { source: 'a', target: 'b', sourceHandle: 'image', targetHandle: 'image' },
      { status: 'dashed_warn', reason: 'test' },
    )
    expect(params.style?.strokeDasharray).toBe('6 4')
    expect(params.data?.compatStatus).toBe('dashed_warn')
    expect(params.animated).toBe(false)
  })
})
