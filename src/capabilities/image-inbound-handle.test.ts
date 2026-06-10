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
    expect(resolveImageInboundHandle('image', 'image', 'i1', 'seedream-4-5', [])).toBe('reference')
  })

  it('rejects image when reference slot taken', () => {
    const edges = [
      { id: 'e1', source: 'i0', target: 'i1', targetHandle: 'reference' },
    ]
    expect(
      resolveImageInboundHandle('image', 'image', 'i1', 'seedream-4-5', edges as never),
    ).toBe(null)
  })

  it('exports unified handle id', () => {
    expect(IMAGE_UNIFIED_INPUT_HANDLE).toBe('in')
  })
})
