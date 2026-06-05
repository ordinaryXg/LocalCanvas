import { describe, expect, it } from 'vitest'
import {
  countVideoReferenceEdges,
  isVideoReferenceImageHandle,
  listVideoReferenceHandles,
  referenceIndexFromHandle,
  videoReferenceHandleFromIndex,
} from './videoReferenceSlots'

describe('videoReferenceSlots', () => {
  it('lists handles up to max', () => {
    expect(listVideoReferenceHandles(3)).toEqual(['reference1', 'reference2', 'reference3'])
  })

  it('parses reference index', () => {
    expect(referenceIndexFromHandle('reference5')).toBe(4)
    expect(isVideoReferenceImageHandle('reference1')).toBe(true)
    expect(isVideoReferenceImageHandle('reference')).toBe(false)
  })

  it('counts reference edges', () => {
    const edges = [
      { target: 'v1', targetHandle: 'reference1' },
      { target: 'v1', targetHandle: 'reference3' },
      { target: 'v1', targetHandle: 'firstFrame' },
      { target: 'v2', targetHandle: 'reference1' },
    ]
    expect(countVideoReferenceEdges(edges, 'v1')).toBe(2)
  })

  it('maps index to handle', () => {
    expect(videoReferenceHandleFromIndex(0)).toBe('reference1')
  })
})
