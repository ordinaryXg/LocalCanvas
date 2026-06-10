import { describe, expect, it } from 'vitest'
import {
  IMAGE_UNIFIED_INPUT_HANDLE,
  resolveImageInboundHandle,
} from './image-inbound-handle'

describe('resolveImageInboundHandle', () => {
  it('maps text to prompt', () => {
    expect(resolveImageInboundHandle('text', 'prompt', 'i1', 'seedream-4-5', [])).toBe('prompt')
  })

  it('maps image to reference when supported', () => {
    expect(resolveImageInboundHandle('image', 'image', 'i1', 'seedream-4-5', [])).toBe('reference1')
  })

  it('rejects image when all reference slots taken', () => {
    const edges = [
      { id: 'e1', source: 'i0', target: 'i1', targetHandle: 'reference1' },
      { id: 'e2', source: 'i2', target: 'i1', targetHandle: 'reference2' },
      { id: 'e3', source: 'i3', target: 'i1', targetHandle: 'reference3' },
      { id: 'e4', source: 'i4', target: 'i1', targetHandle: 'reference4' },
    ]
    expect(
      resolveImageInboundHandle('image', 'image', 'i1', 'seedream-4-5', edges as never),
    ).toBe(null)
  })

  it('exports unified handle id', () => {
    expect(IMAGE_UNIFIED_INPUT_HANDLE).toBe('in')
  })
})
