import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { markNodeGenerating, markNodeProgress } from './dagNodeGeneration'

describe('dagNodeGeneration', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      api: {
        on: vi.fn(() => () => {}),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('markNodeGenerating sets flags', () => {
    const updates: Array<[string, Record<string, unknown>]> = []
    markNodeGenerating('n1', (id, data) => updates.push([id, data]))
    expect(updates[0]).toEqual([
      'n1',
      { isGenerating: true, progress: 0, error: undefined },
    ])
  })

  it('markNodeProgress updates percentage', () => {
    const updates: Array<[string, Record<string, unknown>]> = []
    markNodeProgress('n1', 42, (id, data) => updates.push([id, data]))
    expect(updates[0]).toEqual(['n1', { progress: 42 }])
  })
})
