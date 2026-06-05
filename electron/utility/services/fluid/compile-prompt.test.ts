import { describe, expect, it } from 'vitest'
import { compilePrompt, renormalizeGravity } from './compile-prompt'
import type { ResonanceField } from '../../../../src/types/fluid'

describe('compilePrompt', () => {
  it('blends metaphors from sources', () => {
    const field: ResonanceField = {
      projectId: 'p1',
      sources: [
        {
          id: '1',
          projectId: 'p1',
          type: 'phrase',
          payload: { text: 'rain' },
          vector: [],
          summary: {
            colorTemp: 4000,
            colorHex: '#333',
            arousal: 0.3,
            valence: -0.5,
            metaphor: 'rain night',
          },
          gravity: 0.5,
          orbitIndex: 0,
          createdAt: '',
        },
        {
          id: '2',
          projectId: 'p1',
          type: 'phrase',
          payload: { text: 'neon' },
          vector: [],
          summary: {
            colorTemp: 7000,
            colorHex: '#66f',
            arousal: 0.8,
            valence: 0.2,
            metaphor: 'neon city',
          },
          gravity: 0.5,
          orbitIndex: 1,
          createdAt: '',
        },
      ],
    }
    const { prompt } = compilePrompt('', field)
    expect(prompt).toContain('rain night')
    expect(prompt).toContain('neon city')
  })
})

describe('renormalizeGravity', () => {
  it('sums to 1', () => {
    const sources = renormalizeGravity([
      {
        id: '1',
        projectId: 'p',
        type: 'phrase',
        payload: {},
        vector: [],
        summary: {
          colorTemp: 5000,
          colorHex: '#000',
          arousal: 0.5,
          valence: 0,
          metaphor: 'a',
        },
        gravity: 2,
        orbitIndex: 0,
        createdAt: '',
      },
      {
        id: '2',
        projectId: 'p',
        type: 'phrase',
        payload: {},
        vector: [],
        summary: {
          colorTemp: 5000,
          colorHex: '#000',
          arousal: 0.5,
          valence: 0,
          metaphor: 'b',
        },
        gravity: 2,
        orbitIndex: 1,
        createdAt: '',
      },
    ])
    const sum = sources.reduce((a, s) => a + s.gravity, 0)
    expect(sum).toBeCloseTo(1, 5)
  })
})
