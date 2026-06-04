import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from './canvasStore'

describe('updateNodeData', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      nodes: [{ id: 'n1', type: 'image', position: { x: 0, y: 0 }, data: { prompt: 'hello' } }],
      edges: [],
    })
  })

  it('skips update when data is unchanged', () => {
    const before = useCanvasStore.getState().nodes
    useCanvasStore.getState().updateNodeData('n1', { prompt: 'hello' })
    const after = useCanvasStore.getState().nodes
    expect(after).toBe(before)
  })

  it('updates when data changes', () => {
    useCanvasStore.getState().updateNodeData('n1', { prompt: 'world' })
    expect(useCanvasStore.getState().nodes[0].data.prompt).toBe('world')
  })
})
