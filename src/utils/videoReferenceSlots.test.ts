import { describe, expect, it } from 'vitest'
import {
  countVideoReferenceEdges,
  isImageReferenceHandle,
  isVideoReferenceImageHandle,
  listImageReferenceEdges,
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

  it('recognizes image reference handles', () => {
    expect(isImageReferenceHandle('reference')).toBe(true)
    expect(isImageReferenceHandle('reference1')).toBe(true)
    expect(isImageReferenceHandle('reference14')).toBe(true)
    expect(isImageReferenceHandle('prompt')).toBe(false)
  })

  it('lists image reference edges in slot order', () => {
    const edges = [
      { id: 'e3', source: 'img3', target: 'i1', targetHandle: 'reference3' },
      { id: 'e1', source: 'img1', target: 'i1', targetHandle: 'reference1' },
      { id: 'e2', source: 'img2', target: 'i1', targetHandle: 'reference' },
      { id: 'e4', source: 'img4', target: 'i2', targetHandle: 'reference1' },
    ]
    expect(listImageReferenceEdges(edges, 'i1').map((e) => e.id)).toEqual(['e1', 'e2', 'e3'])
  })
})
