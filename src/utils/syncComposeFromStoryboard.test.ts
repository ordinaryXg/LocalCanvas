import { describe, it, expect } from 'vitest'
import { wireComposeToStoryboardSelectedTakes } from './syncComposeFromStoryboard'
import type { StoryboardFrame } from '../types/storyboard'
import type { Node, Edge } from '@xyflow/react'

describe('syncComposeFromStoryboard', () => {
  it('wires compose clips to selected take video nodes', () => {
    const frames: StoryboardFrame[] = [
      {
        id: 'f1',
        sequence: 1,
        description: '镜1',
        prompt: 'p1',
        duration: 5,
        status: 'video',
        videoNodeId: 'vid-old',
        takes: [
          { id: 't1', videoNodeId: 'vid-old' },
          { id: 't2', videoNodeId: 'vid-selected' },
        ],
        selectedTakeId: 't2',
      },
    ]

    const nodes: Node[] = [
      {
        id: 'vid-selected',
        type: 'video',
        position: { x: 0, y: 0 },
        data: { duration: 5, videoAssetPath: '/a.mp4', fileName: 'take2' },
      },
      {
        id: 'compose-1',
        type: 'compose',
        position: { x: 0, y: 0 },
        data: { clips: [{ id: 'slot-1', name: 'video1', duration: 0 }] },
      },
    ]

    const edges: Edge[] = [
      {
        id: 'e-old',
        source: 'vid-old',
        target: 'compose-1',
        sourceHandle: 'video',
        targetHandle: 'video1',
      },
    ]

    const result = wireComposeToStoryboardSelectedTakes(frames, 'compose-1', nodes, edges)
    expect(result.edgeIdsToRemove).toEqual(['e-old'])
    expect(result.edgesToAdd[0]?.source).toBe('vid-selected')
    expect(result.composeClips[0]?.sourceNodeId).toBe('vid-selected')
    expect(result.wiredCount).toBe(1)
  })
})
