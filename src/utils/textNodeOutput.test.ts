import { describe, expect, it } from 'vitest'
import { normalizeTextNodeData, textNodeOutput } from './textNodeOutput'

describe('textNodeOutput', () => {
  it('returns output field when set', () => {
    expect(textNodeOutput({ output: 'downstream text' })).toBe('downstream text')
  })

  it('falls back to legacy generatedContent', () => {
    expect(
      textNodeOutput({ generatedContent: 'ai', inputContent: 'draft' }),
    ).toBe('ai')
  })

  it('falls back to inputContent when no output', () => {
    expect(textNodeOutput({ inputContent: 'only draft' })).toBe('only draft')
  })

  it('uses draft in passthrough when output not manually edited', () => {
    expect(
      textNodeOutput({
        outputMode: 'passthrough',
        draft: 'live draft text',
        output: 'stale output',
        outputEdited: false,
      }),
    ).toBe('live draft text')
  })

  it('keeps manual output in passthrough when outputEdited', () => {
    expect(
      textNodeOutput({
        outputMode: 'passthrough',
        draft: 'new draft',
        output: 'hand edited',
        outputEdited: true,
      }),
    ).toBe('hand edited')
  })
})

describe('normalizeTextNodeData', () => {
  it('migrates inputContent and generatedContent', () => {
    const result = normalizeTextNodeData({
      inputContent: 'raw',
      generatedContent: 'polished',
    })
    expect(result.draft).toBe('raw')
    expect(result.output).toBe('polished')
    expect(result.outputMode).toBe('generated')
  })

  it('uses passthrough when only input exists', () => {
    const result = normalizeTextNodeData({ inputContent: 'direct' })
    expect(result.draft).toBe('direct')
    expect(result.output).toBe('direct')
    expect(result.outputMode).toBe('passthrough')
  })

  it('preserves already normalized data', () => {
    const result = normalizeTextNodeData({
      draft: 'a',
      output: 'b',
      outputMode: 'passthrough',
    })
    expect(result).toMatchObject({ draft: 'a', output: 'b', outputMode: 'passthrough' })
  })
})
