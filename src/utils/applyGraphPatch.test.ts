import { describe, it, expect } from 'vitest'
import type { Edge, Node } from '@xyflow/react'
import { applyGraphPatch } from './applyGraphPatch'
import type { GraphPatch } from '../types/agent'

describe('applyGraphPatch', () => {
  const imageNode: Node = {
    id: 'image-abc',
    type: 'image',
    position: { x: 0, y: 0 },
    data: { label: '主图' },
  }

  const nodes: Node[] = [imageNode]
  const edges: Edge[] = []

  it('adds video node while keeping anchor image (ST-06)', () => {
    const patch: GraphPatch = {
      version: 1,
      intent: '后接视频',
      summary: '在图像后添加视频节点',
      anchorNodeIds: ['image-abc'],
      addNodes: [
        {
          tempId: 'video-new',
          type: 'video',
          label: '成片',
          data: { duration: 5, modelId: 'vid-1' },
        },
      ],
      addEdges: [
        {
          source: 'image-abc',
          sourceHandle: 'image',
          target: 'video-new',
          targetHandle: 'firstFrame',
        },
      ],
    }

    const result = applyGraphPatch({ patch, nodes, edges })
    expect(result.error).toBeUndefined()
    expect(result.nodesToAdd).toHaveLength(1)
    expect(result.nodesToAdd[0]?.type).toBe('video')
    expect(result.nodeIdsToRemove).toHaveLength(0)
    expect(result.edgesToAdd).toHaveLength(1)
    expect(result.edgesToAdd[0]?.source).toBe('image-abc')
  })

  it('rejects patch when anchor missing', () => {
    const result = applyGraphPatch({
      patch: {
        version: 1,
        intent: 'test',
        summary: 'x',
        anchorNodeIds: ['missing'],
      },
      nodes,
      edges,
    })
    expect(result.error).toContain('锚定节点')
  })
})
