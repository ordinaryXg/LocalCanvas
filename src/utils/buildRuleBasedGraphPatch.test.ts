import { describe, it, expect } from 'vitest'
import { tryBuildRuleBasedGraphPatch } from './buildRuleBasedGraphPatch'

describe('tryBuildRuleBasedGraphPatch', () => {
  it('builds image→video patch for B-02 intent (ST-06)', () => {
    const patch = tryBuildRuleBasedGraphPatch({
      message: '在这张图后面接 5 秒视频，首帧用这张图',
      focusedNodeIds: ['image-abc'],
      canvasNodes: [
        {
          id: 'image-abc',
          type: 'image',
          label: '主图',
          data: { label: '主图' },
        },
      ],
    })

    expect(patch).not.toBeNull()
    expect(patch?.anchorNodeIds).toEqual(['image-abc'])
    expect(patch?.addNodes?.[0]?.type).toBe('video')
    expect(patch?.addNodes?.[0]?.data.duration).toBe(5)
    expect(patch?.addEdges?.[0]?.source).toBe('image-abc')
    expect(patch?.addEdges?.[0]?.targetHandle).toBe('firstFrame')
  })

  it('returns null for non-image anchor', () => {
    const patch = tryBuildRuleBasedGraphPatch({
      message: '后面接视频',
      focusedNodeIds: ['text-1'],
      canvasNodes: [{ id: 'text-1', type: 'text', data: {} }],
    })
    expect(patch).toBeNull()
  })
})
