import { test, expect } from '@playwright/test'
import { clipsFromComposeNode } from '../src/hooks/useCompose'
import type { ComposeClipItem } from '../src/types/node'

test.describe('compose pipeline smoke', () => {
  test('maps compose node clips and sorts by startTime for concat', () => {
    const clips: ComposeClipItem[] = [
      { id: 'b', duration: 4, startTime: 10, assetPath: 'videos/b.mp4' },
      { id: 'a', duration: 3, startTime: 0, assetPath: 'videos/a.mp4' },
      { id: 'c', duration: 2, startTime: 5, assetPath: 'videos/c.mp4' },
    ]

    const mapped = clipsFromComposeNode(clips)
    const sorted = [...mapped].sort((x, y) => x.startTime - y.startTime)
    expect(sorted.map((c) => c.id)).toEqual(['a', 'c', 'b'])
    expect(mapped).toHaveLength(3)
  })
})
