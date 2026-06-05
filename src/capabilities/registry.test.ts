import { describe, expect, it } from 'vitest'
import { resolveProfile, resolveModelIdWithAlias } from './registry'

describe('resolveProfile', () => {
  it('resolves by config id', () => {
    const p = resolveProfile({ configId: 'deepseek-v4-flash' })
    expect(p.profile_key).toBe('deepseek-v4-flash')
  })

  it('resolves legacy deepseek config id', () => {
    const p = resolveProfile({ configId: 'deepseek' })
    expect(p.profile_key).toBe('deepseek-v4-flash')
  })

  it('resolves seedance 2.0 by config id', () => {
    const p = resolveProfile({ configId: 'seedance-2-0', kind: 'video' })
    expect(p.inputs.some((s) => s.id === 'last_frame')).toBe(true)
  })

  it('seedance 1.0 has no last_frame slot', () => {
    const p = resolveProfile({ configId: 'seedance-1-0-pro-fast', kind: 'video' })
    expect(p.inputs.some((s) => s.id === 'last_frame')).toBe(false)
  })

  it('falls back for unknown model', () => {
    const p = resolveProfile({ model: 'unknown-xyz', kind: 'llm' })
    expect(p.confidence).toBe('inferred')
  })
})

describe('resolveModelIdWithAlias', () => {
  it('migrates deepseek-chat', () => {
    const r = resolveModelIdWithAlias('deepseek-chat')
    expect(r.migratedFrom).toBe('deepseek-chat')
    expect(r.defaultThinkingPreset).toBe('off')
  })
})
