import { describe, expect, it } from 'vitest'
import {
  resolveVideoInboundHandle,
  VIDEO_UNIFIED_INPUT_HANDLE,
} from './video-inbound-handle'

describe('resolveVideoInboundHandle', () => {
  it('maps text to prompt', () => {
    expect(resolveVideoInboundHandle('text', 'prompt', 'v1', 'seedance-2-0', [])).toBe('prompt')
  })

  it('assigns image to first free frame slot', () => {
    expect(resolveVideoInboundHandle('image', 'image', 'v1', 'seedance-1-0-pro-fast', [])).toBe(
      'firstFrame',
    )
  })

  it('skips occupied firstFrame for image', () => {
    const edges = [
      {
        id: 'e1',
        source: 'i1',
        target: 'v1',
        targetHandle: 'firstFrame',
      },
    ]
    expect(
      resolveVideoInboundHandle('image', 'image', 'v1', 'seedance-1-0-pro-fast', edges as never),
    ).toBe(null)
  })

  it('exports unified handle id', () => {
    expect(VIDEO_UNIFIED_INPUT_HANDLE).toBe('in')
  })
})
