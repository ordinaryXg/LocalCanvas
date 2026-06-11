import { describe, it, expect } from 'vitest'
import { selectStoryboardTake, resolveFrameActiveMedia } from './storyboardTakes'
import type { StoryboardFrame } from '../types/storyboard'

describe('storyboardTakes', () => {
  it('selects active take media', () => {
    const frame: StoryboardFrame = {
      id: 'f1',
      sequence: 1,
      description: 'A',
      prompt: 'A',
      duration: 5,
      status: 'video',
      takes: [
        { id: 't1', videoNodeId: 'v1', label: 'Take 1' },
        { id: 't2', videoNodeId: 'v2', label: 'Take 2' },
      ],
      selectedTakeId: 't1',
    }
    const selected = selectStoryboardTake(frame, 't2')
    expect(selected.selectedTakeId).toBe('t2')
    expect(resolveFrameActiveMedia(selected).videoNodeId).toBe('v2')
  })
})
