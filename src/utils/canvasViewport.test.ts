import { describe, it, expect } from 'vitest'
import { viewportLikelyShowsNodes } from './canvasViewport'
import type { Node } from '@xyflow/react'

describe('viewportLikelyShowsNodes', () => {
  it('returns true when node list is empty', () => {
    const reactFlow = {
      getNodesBounds: () => ({ x: 0, y: 0, width: 0, height: 0 }),
      screenToFlowPosition: () => ({ x: 0, y: 0 }),
    }
    expect(viewportLikelyShowsNodes(reactFlow as never, [], null)).toBe(true)
  })

  it('returns false when nodes are outside viewport', () => {
    const nodes: Node[] = [
      { id: 'n1', type: 'text', position: { x: 5000, y: 5000 }, data: {} },
    ]
    const reactFlow = {
      getNodesBounds: () => ({ x: 5000, y: 5000, width: 200, height: 100 }),
      screenToFlowPosition: ({ x }: { x: number }) =>
        x === 0 ? { x: 0, y: 0 } : { x: 800, y: 600 },
    }
    const container = { clientWidth: 800, clientHeight: 600 } as HTMLElement
    expect(viewportLikelyShowsNodes(reactFlow as never, nodes, container)).toBe(false)
  })
})
