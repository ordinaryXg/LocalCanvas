import { describe, expect, it } from 'vitest'
import {
  storyboardEmptyHint,
  storyboardFooterText,
  storyboardOverflowCount,
  storyboardPreviewFrames,
  storyboardFrameStats,
  storyboardSyncedFrameCount,
  storyboardVirtualRowRange,
  storyboardGridRowCount,
} from './storyboardNodeDisplay'
import type { StoryboardFrame } from '../types/storyboard'

const frame = (partial: Partial<StoryboardFrame> & Pick<StoryboardFrame, 'id' | 'sequence'>): StoryboardFrame => ({
  description: '',
  prompt: '',
  duration: 5,
  status: 'empty',
  ...partial,
})

describe('storyboardNodeDisplay', () => {
  it('formats empty hint and footer', () => {
    expect(storyboardEmptyHint()).toBe('0 帧 · 双击编辑')
    const frames = [
      frame({ id: 'a', sequence: 1, imagePath: 'images/a.png', status: 'image' }),
      frame({ id: 'b', sequence: 2, status: 'empty' }),
    ]
    expect(storyboardFooterText(frames)).toBe('2 帧 · 1 图')
  })

  it('counts video in footer', () => {
    const frames = [
      frame({ id: 'a', sequence: 1, imagePath: 'a.png', status: 'video', videoPath: 'v.mp4' }),
    ]
    expect(storyboardFooterText(frames)).toBe('1 帧 · 1 图 · 1 视频')
  })

  it('slices preview and overflow by layout', () => {
    const frames = Array.from({ length: 12 }, (_, i) =>
      frame({ id: `f${i}`, sequence: i + 1 }),
    )
    expect(storyboardPreviewFrames(frames, 'grid3')).toHaveLength(9)
    expect(storyboardOverflowCount(frames, 'grid3')).toBe(3)
    expect(storyboardPreviewFrames(frames, 'list')).toHaveLength(5)
    expect(storyboardOverflowCount(frames, 'list')).toBe(7)
    expect(storyboardPreviewFrames(frames, 'grid5')).toHaveLength(12)
    expect(storyboardFrameStats(frames).total).toBe(12)
  })

  it('counts synced frames and virtual rows', () => {
    const frames = [
      frame({ id: 'a', sequence: 1, imageNodeId: 'img-1' }),
      frame({ id: 'b', sequence: 2 }),
    ]
    expect(storyboardSyncedFrameCount(frames)).toBe(1)
    expect(storyboardGridRowCount(25, 5)).toBe(5)
    const range = storyboardVirtualRowRange(80, 200, 10, 78)
    expect(range.startRow).toBeGreaterThanOrEqual(0)
    expect(range.endRow).toBeGreaterThan(range.startRow)
  })
})
