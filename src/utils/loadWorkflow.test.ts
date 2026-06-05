import { describe, it, expect } from 'vitest'
import { remapWorkflowToCanvas } from './loadWorkflow'

describe('remapWorkflowToCanvas', () => {
  it('remaps node and edge ids', () => {
    const nodes = [
      { id: 'text-1', type: 'text', position: { x: 0, y: 0 }, data: { content: 'hello' } },
      { id: 'image-1', type: 'image', position: { x: 100, y: 0 }, data: {} },
    ]
    const edges = [
      { id: 'e1', source: 'text-1', target: 'image-1', sourceHandle: 'prompt', targetHandle: 'prompt' },
    ]

    const result = remapWorkflowToCanvas(nodes, edges)

    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(1)
    expect(result.nodes[0].id).not.toBe('text-1')
    expect(result.edges[0].source).toBe(result.nodes[0].id)
    expect(result.edges[0].target).toBe(result.nodes[1].id)
  })

  it('applies offset to positions', () => {
    const nodes = [{ id: 'n1', type: 'text', position: { x: 10, y: 20 }, data: {} }]
    const result = remapWorkflowToCanvas(nodes, [], { x: 50, y: 100 })
    expect(result.nodes[0].position).toEqual({ x: 60, y: 120 })
  })
})
