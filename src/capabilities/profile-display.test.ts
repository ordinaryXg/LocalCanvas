import { describe, expect, it } from 'vitest'
import {
  formatInputBadges,
  formatOutputBadges,
  formatReasoningBadge,
  resolveProfileForConfig,
} from './profile-display'

describe('profile-display', () => {
  it('formats seedream inputs and outputs', () => {
    const p = resolveProfileForConfig('seedream-4-5', undefined, 'image')
    expect(formatInputBadges(p)).toContain('文*')
    expect(formatOutputBadges(p)).toEqual(['图'])
  })

  it('formats deepseek reasoning badge', () => {
    const p = resolveProfileForConfig('deepseek-v4-flash', undefined, 'llm')
    expect(formatReasoningBadge(p)).toBe('思考：可关')
  })

  it('formats kimi thinking model', () => {
    const p = resolveProfileForConfig('kimi-k2-thinking', undefined, 'llm')
    expect(formatReasoningBadge(p)).toBe('推理专用')
  })
})
