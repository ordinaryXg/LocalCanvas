import { describe, it, expect } from 'vitest'
import { topologicalSort, DagCycleError } from './topologicalSort'

describe('topologicalSort', () => {
  it('sorts linear chain', () => {
    expect(
      topologicalSort(['a', 'b', 'c'], [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ]),
    ).toEqual(['a', 'b', 'c'])
  })

  it('sorts diamond graph', () => {
    const sorted = topologicalSort(['a', 'b', 'c', 'd'], [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
      { source: 'b', target: 'd' },
      { source: 'c', target: 'd' },
    ])
    expect(sorted.indexOf('a')).toBeLessThan(sorted.indexOf('b'))
    expect(sorted.indexOf('a')).toBeLessThan(sorted.indexOf('c'))
    expect(sorted.indexOf('b')).toBeLessThan(sorted.indexOf('d'))
    expect(sorted.indexOf('c')).toBeLessThan(sorted.indexOf('d'))
  })

  it('ignores edges outside node set', () => {
    expect(topologicalSort(['a', 'b'], [{ source: 'a', target: 'x' }])).toEqual(['a', 'b'])
  })

  it('throws on cycle', () => {
    expect(() =>
      topologicalSort(['a', 'b'], [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'a' },
      ]),
    ).toThrow(DagCycleError)
  })
})
