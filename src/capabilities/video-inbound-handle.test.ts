import { describe, expect, it } from 'vitest'
import {
  resolveVideoInboundHandle,
  VIDEO_IMAGE_INBOX_HANDLE,
  VIDEO_UNIFIED_INPUT_HANDLE,
} from './video-inbound-handle'

describe('resolveVideoInboundHandle', () => {
  it('maps text to prompt', () => {
    expect(resolveVideoInboundHandle('text', 'prompt', 'v1', 'seedance-2-0', [])).toBe('prompt')
  })

  it('resolves image inbound when target modelId is unset', () => {
    expect(
      resolveVideoInboundHandle('image', 'image', 'v1', undefined, [], {
        firstLast: false,
        reference: false,
      }),
    ).toBe(VIDEO_IMAGE_INBOX_HANDLE)
  })

  it('assigns image to firstFrame when firstLast mode on', () => {
    expect(
      resolveVideoInboundHandle('image', 'image', 'v1', 'seedance-1-0-pro-fast', [], {
        firstLast: true,
        reference: false,
      }),
    ).toBe('firstFrame')
  })

  it('assigns image to inbox when firstLast mode off', () => {
    expect(
      resolveVideoInboundHandle('image', 'image', 'v1', 'seedance-2-0', [], {
        firstLast: false,
        reference: false,
      }),
    ).toBe(VIDEO_IMAGE_INBOX_HANDLE)
  })

  it('uses inbox when firstFrame occupied even if firstLast on', () => {
    const edges = [
      {
        id: 'e1',
        source: 'i1',
        target: 'v1',
        targetHandle: 'firstFrame',
      },
    ]
    expect(
      resolveVideoInboundHandle('image', 'image', 'v1', 'seedance-1-0-pro-fast', edges as never, {
        firstLast: true,
        reference: false,
      }),
    ).toBe(VIDEO_IMAGE_INBOX_HANDLE)
  })

  it('exports unified handle id', () => {
    expect(VIDEO_UNIFIED_INPUT_HANDLE).toBe('in')
  })
})
