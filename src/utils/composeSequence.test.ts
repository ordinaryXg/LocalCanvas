import { describe, expect, it } from 'vitest'
import {
  applySequentialStartTimes,
  getActiveClips,
  isComposeVideoHandle,
  reorderClips,
  requiredVideoInputCount,
} from './composeSequence'
import type { ComposeClipItem } from '../types/node'

describe('composeSequence', () => {
  it('detects dynamic video handles', () => {
    expect(isComposeVideoHandle('video1')).toBe(true)
    expect(isComposeVideoHandle('video4')).toBe(true)
    expect(isComposeVideoHandle('audio')).toBe(false)
  })

  it('computes sequential start times', () => {
    const clips: ComposeClipItem[] = [
      { id: 'a', duration: 3 },
      { id: 'b', duration: 5, excluded: true },
      { id: 'c', duration: 2 },
    ]
    const result = applySequentialStartTimes(clips)
    expect(result[0].startTime).toBe(0)
    expect(result[2].startTime).toBe(3)
    expect(getActiveClips(result)).toHaveLength(2)
  })

  it('reorders clips', () => {
    const clips: ComposeClipItem[] = [
      { id: 'a', duration: 2 },
      { id: 'b', duration: 3 },
      { id: 'c', duration: 4 },
    ]
    const next = reorderClips(clips, 'c', 0)
    expect(next.map((c) => c.id)).toEqual(['c', 'a', 'b'])
    expect(next[0].startTime).toBe(0)
    expect(next[1].startTime).toBe(4)
  })

  it('requires at least 3 video inputs', () => {
    expect(requiredVideoInputCount([], 0)).toBe(3)
    expect(requiredVideoInputCount([{ id: 'x-video5', duration: 1 }], 2)).toBe(5)
  })
})
