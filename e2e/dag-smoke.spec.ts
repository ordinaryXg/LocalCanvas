import { test, expect } from '@playwright/test'
import { topologicalSort } from '../src/utils/dag/topologicalSort'

test.describe('DAG smoke', () => {
  test('topological order respects dependencies', () => {
    const order = topologicalSort(
      ['a', 'b', 'c'],
      [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ],
    )
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'))
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'))
  })
})
