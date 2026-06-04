import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import { collectWorkflowNodeIds, extractWorkflowSnapshot } from './workflow'

describe('workflow', () => {
  it('collectWorkflowNodeIds includes group children', () => {
    const nodes: Node[] = [
      { id: 'g1', type: 'group', position: { x: 0, y: 0 }, data: {} },
      { id: 'n1', type: 'text', position: { x: 0, y: 0 }, data: {}, parentId: 'g1' },
      { id: 'n2', type: 'text', position: { x: 0, y: 0 }, data: {} },
    ]
    const ids = collectWorkflowNodeIds(nodes, ['g1'])
    expect(ids.has('g1')).toBe(true)
    expect(ids.has('n1')).toBe(true)
    expect(ids.has('n2')).toBe(false)
  })

  it('extractWorkflowSnapshot includes internal edges', () => {
    const nodes: Node[] = [
      { id: 'n1', type: 'text', position: { x: 0, y: 0 }, data: {} },
      { id: 'n2', type: 'image', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'prompt', targetHandle: 'prompt' },
      { id: 'e2', source: 'n2', target: 'n1', sourceHandle: 'reference', targetHandle: 'reference' },
    ]
    const snap = extractWorkflowSnapshot(nodes, edges, ['n1', 'n2'])
    expect(snap.edges).toHaveLength(2)
    expect(snap.edges.map((e) => e.id).sort()).toEqual(['e1', 'e2'])
  })

  it('extractWorkflowSnapshot strips blob fields', () => {
    const nodes: Node[] = [
      {
        id: 'i1',
        type: 'image',
        position: { x: 0, y: 0 },
        data: { imageAssetPath: 'images/a.png', imageSrc: 'blob:x' },
      },
    ]
    const snap = extractWorkflowSnapshot(nodes, [], ['i1'])
    expect(snap.nodes[0].data.imageAssetPath).toBe('images/a.png')
    expect(snap.nodes[0].data).not.toHaveProperty('imageSrc')
  })
})
