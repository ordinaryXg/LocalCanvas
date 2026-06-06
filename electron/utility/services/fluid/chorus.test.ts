import { describe, expect, it } from 'vitest'
import { applyResolution, normalizeChorusResolution } from './chorus'
import type { ResonanceField } from '../../../../src/types/fluid'

const field: ResonanceField = {
  projectId: 'p1',
  sources: [
    {
      id: 's1',
      projectId: 'p1',
      gravity: 0.5,
      summary: { metaphor: 'cyberpunk rain', tags: ['neon'] },
      createdAt: '',
      updatedAt: '',
    },
  ],
}

describe('normalizeChorusResolution', () => {
  it('defaults missing fields to empty arrays', () => {
    expect(normalizeChorusResolution(null)).toEqual({
      tuningAdjustments: [],
      affectAdjustments: [],
      promptModifiers: [],
      blockers: [],
    })
  })

  it('wraps a single tuning adjustment object', () => {
    const r = normalizeChorusResolution({
      tuningAdjustments: { tag: 'cyber', gravityDelta: -0.2 },
      promptModifiers: 'desaturate',
    })
    expect(r.tuningAdjustments).toHaveLength(1)
    expect(r.tuningAdjustments[0].tag).toBe('cyber')
    expect(r.promptModifiers).toEqual(['desaturate'])
  })
})

describe('applyResolution', () => {
  it('does not throw when tuningAdjustments is missing', () => {
    const next = applyResolution(field, {})
    expect(next.sources).toHaveLength(1)
  })

  it('adjusts gravity by tag', () => {
    const next = applyResolution(field, {
      tuningAdjustments: [{ tag: 'cyber', gravityDelta: -0.3 }],
      promptModifiers: [],
      blockers: [],
    })
    expect(next.sources[0].gravity).toBeLessThan(0.5)
  })
})
