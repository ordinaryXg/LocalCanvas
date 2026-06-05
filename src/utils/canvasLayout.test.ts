import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import { computeCanvasLayout } from './canvasLayout'

describe('computeCanvasLayout', () => {
  it('lays out a linear chain left to right', () => {
    const nodes: Node[] = [
      { id: 't1', type: 'text', position: { x: 900, y: 400 }, data: {} },
      { id: 'i1', type: 'image', position: { x: 100, y: 50 }, data: {} },
      { id: 'v1', type: 'video', position: { x: 500, y: 300 }, data: {} },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 't1', target: 'i1' },
      { id: 'e2', source: 'i1', target: 'v1' },
    ]

    const positions = computeCanvasLayout(nodes, edges)
    expect(positions.get('t1')!.x).toBeLessThan(positions.get('i1')!.x)
    expect(positions.get('i1')!.x).toBeLessThan(positions.get('v1')!.x)
  })

  it('skips child nodes inside groups', () => {
    const nodes: Node[] = [
      { id: 'g1', type: 'group', position: { x: 0, y: 0 }, data: {} },
      { id: 'c1', type: 'text', parentId: 'g1', position: { x: 10, y: 10 }, data: {} },
    ]
    const positions = computeCanvasLayout(nodes, [])
    expect(positions.size).toBe(1)
    expect(positions.has('g1')).toBe(true)
    expect(positions.has('c1')).toBe(false)
  })

  it('returns empty map when no top-level nodes', () => {
    const nodes: Node[] = [
      { id: 'c1', type: 'text', parentId: 'g1', position: { x: 0, y: 0 }, data: {} },
    ]
    expect(computeCanvasLayout(nodes, [])).toEqual(new Map())
  })
})
