import { describe, expect, it } from 'vitest'
import {
  filterClipsInTimeRange,
  visibleTimeRangeFromScroll,
} from './timelineVisibleClips'

describe('filterClipsInTimeRange', () => {
  const clips = [
    { id: 'a', startTime: 0, duration: 5 },
    { id: 'b', startTime: 10, duration: 5 },
    { id: 'c', startTime: 20, duration: 5 },
  ]

  it('returns clips intersecting the visible window', () => {
    const visible = filterClipsInTimeRange(clips, 8, 12)
    expect(visible.map((c) => c.id)).toEqual(['b'])
  })

  it('includes clips that partially overlap range edges', () => {
    const visible = filterClipsInTimeRange(clips, 4, 11)
    expect(visible.map((c) => c.id)).toEqual(['a', 'b'])
  })
})

describe('visibleTimeRangeFromScroll', () => {
  it('maps scroll position to time range with label offset', () => {
    const range = visibleTimeRangeFromScroll(160, 800, 60, 50, 120, 0)
    expect(range.start).toBe(2)
    expect(range.end).toBe(16.8)
  })
})
