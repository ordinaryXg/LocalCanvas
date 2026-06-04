import { describe, expect, it } from 'vitest'
import { clipsFromComposeNode } from '../hooks/useCompose'
import type { ComposeClipItem } from '../types/node'

describe('clipsFromComposeNode', () => {
  it('maps compose clips with defaults', () => {
    const input: ComposeClipItem[] = [
      { id: 'c1', assetPath: 'videos/a.mp4', duration: 4, startTime: 1 },
      { name: '片段2', duration: 0 },
    ]

    expect(clipsFromComposeNode(input)).toEqual([
      { id: 'c1', assetPath: 'videos/a.mp4', absolutePath: undefined, startTime: 1, duration: 4 },
      { id: 'clip-1', assetPath: undefined, absolutePath: undefined, startTime: 0, duration: 5 },
    ])
  })

  it('returns empty array for undefined', () => {
    expect(clipsFromComposeNode(undefined)).toEqual([])
  })
})
