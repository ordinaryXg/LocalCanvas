import { describe, expect, it } from 'vitest'
import {
  countLlmVisionImageEdges,
  isLlmVisionImageHandle,
  listLlmVisionImageHandles,
  visionImageIndexFromHandle,
} from './llmVisionSlots'

describe('llmVisionSlots', () => {
  it('recognizes legacy and numbered handles', () => {
    expect(isLlmVisionImageHandle('image')).toBe(true)
    expect(isLlmVisionImageHandle('image3')).toBe(true)
    expect(isLlmVisionImageHandle('prompt')).toBe(false)
  })

  it('lists handles by max', () => {
    expect(listLlmVisionImageHandles(3)).toEqual(['image1', 'image2', 'image3'])
  })

  it('counts vision edges', () => {
    const edges = [
      { target: 't1', targetHandle: 'image' },
      { target: 't1', targetHandle: 'image2' },
      { target: 't1', targetHandle: 'prompt' },
    ]
    expect(countLlmVisionImageEdges(edges, 't1')).toBe(2)
  })

  it('parses index', () => {
    expect(visionImageIndexFromHandle('image')).toBe(0)
    expect(visionImageIndexFromHandle('image4')).toBe(3)
  })
})
