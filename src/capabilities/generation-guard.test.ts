import { describe, expect, it } from 'vitest'
import { assertNoWarnEdgesForNode, GenerationBlockedError } from './generation-guard'

describe('assertNoWarnEdgesForNode', () => {
  it('passes when no inbound warn edges', () => {
    expect(() =>
      assertNoWarnEdgesForNode(
        't1',
        [{ id: 't1', type: 'text', data: { modelId: 'gpt-4o' } }],
        [],
        'text_llm',
      ),
    ).not.toThrow()
  })

  it('blocks text_llm when image inbound is unsupported for non-vision model', () => {
    expect(() =>
      assertNoWarnEdgesForNode(
        't1',
        [
          { id: 'i1', type: 'image' },
          { id: 't1', type: 'text', data: { modelId: 'deepseek-v4-flash' } },
        ],
        [
          {
            id: 'e1',
            source: 'i1',
            target: 't1',
            sourceHandle: 'image',
            targetHandle: 'image',
          },
        ],
        'text_llm',
      ),
    ).toThrow(GenerationBlockedError)
  })

  it('allows text_llm without vision edges on non-vision model', () => {
    expect(() =>
      assertNoWarnEdgesForNode(
        't1',
        [{ id: 't1', type: 'text', data: { modelId: 'deepseek-v4-flash' } }],
        [],
        'text_llm',
      ),
    ).not.toThrow()
  })

  it('blocks video generate when lastFrame inbound is dashed for seedance 1.0', () => {
    expect(() =>
      assertNoWarnEdgesForNode(
        'v1',
        [
          { id: 'img', type: 'image' },
          { id: 'v1', type: 'video', data: { modelId: 'seedance-1-0-pro-fast' } },
        ],
        [
          {
            id: 'e1',
            source: 'img',
            target: 'v1',
            sourceHandle: 'image',
            targetHandle: 'lastFrame',
          },
        ],
        'video',
      ),
    ).toThrow(GenerationBlockedError)
  })
})
