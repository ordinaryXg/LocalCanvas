import { describe, expect, it } from 'vitest'
import { buildReasoningParams, supportsThinkingUi } from './reasoning-params'
import { resolveProfile } from './registry'

describe('buildReasoningParams', () => {
  it('maps deepseek off to disabled thinking', () => {
    const profile = resolveProfile({ configId: 'deepseek-v4-flash' })
    const params = buildReasoningParams(profile, 'off')
    expect(params).toMatchObject({
      extra_body: { thinking: { type: 'disabled' } },
    })
  })

  it('maps deepseek deep to max effort', () => {
    const profile = resolveProfile({ configId: 'deepseek-v4-pro' })
    const params = buildReasoningParams(profile, 'deep')
    expect(params).toMatchObject({
      reasoning_effort: 'max',
    })
  })

  it('gpt-4o has no thinking ui', () => {
    const profile = resolveProfile({ configId: 'gpt-4o' })
    expect(supportsThinkingUi(profile)).toBe(false)
    expect(buildReasoningParams(profile, 'deep')).toEqual({})
  })
})
