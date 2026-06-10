import { describe, expect, it } from 'vitest'
import { getNodeVisualVariant } from './nodeVisualVariant'

describe('getNodeVisualVariant', () => {
  it('returns stable values for the same node id', () => {
    const a = getNodeVisualVariant('image-abc')
    const b = getNodeVisualVariant('image-abc')
    expect(a).toEqual(b)
  })

  it('keeps rotation within subtle range', () => {
    const { rotateDeg } = getNodeVisualVariant('image-xyz')
    expect(rotateDeg).toBeGreaterThanOrEqual(-1.8)
    expect(rotateDeg).toBeLessThanOrEqual(1.8)
  })
})
