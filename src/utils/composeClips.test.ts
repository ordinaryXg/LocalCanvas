import { describe, expect, it } from 'vitest'
import { clipsFromComposeNode } from '../hooks/useCompose'
import type { ComposeClipItem } from '../types/node'

describe('clipsFromComposeNode', () => {
  it('maps compose clips with defaults', () => {
    const input: ComposeClipItem[] = [
      { id: 'c1', assetPath: 'videos/a.mp4', duration: 4, startTime: 1 },
      { id: 'c2', name: '片段2', duration: 3 },
      { id: 'c3', name: '排除', duration: 2, excluded: true },
    ]

    expect(clipsFromComposeNode(input)).toEqual([
      {
        id: 'c1',
        assetPath: 'videos/a.mp4',
        absolutePath: undefined,
        startTime: 0,
        duration: 4,
        trimIn: 0,
      },
      {
        id: 'c2',
        assetPath: undefined,
        absolutePath: undefined,
        startTime: 4,
        duration: 3,
        trimIn: 0,
      },
    ])
  })

  it('returns empty array for undefined', () => {
    expect(clipsFromComposeNode(undefined)).toEqual([])
  })
})
