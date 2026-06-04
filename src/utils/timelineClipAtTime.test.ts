import { describe, expect, it } from 'vitest'
import { findClipAtTime } from './timelineClipAtTime'

describe('findClipAtTime', () => {
  const clips = [
    { id: 'a', startTime: 0, duration: 5 },
    { id: 'b', startTime: 5, duration: 3 },
  ]

  it('returns clip and offset inside range', () => {
    expect(findClipAtTime(clips, 2)).toEqual({ clip: clips[0], offsetInClip: 2 })
    expect(findClipAtTime(clips, 6)).toEqual({ clip: clips[1], offsetInClip: 1 })
  })

  it('returns null outside all clips', () => {
    expect(findClipAtTime(clips, 8)).toBeNull()
    expect(findClipAtTime([], 0)).toBeNull()
  })
})
