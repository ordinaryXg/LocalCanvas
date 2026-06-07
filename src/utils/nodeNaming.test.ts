import { describe, expect, it } from 'vitest'
import type { Node } from '@xyflow/react'
import { nextDefaultNodeTitle, withDefaultNodeTitle } from './nodeNaming'

describe('nodeNaming', () => {
  it('assigns incrementing titles', () => {
    const nodes: Node[] = [
      { id: 'i1', type: 'image', position: { x: 0, y: 0 }, data: { title: '图片 1' } },
      { id: 'i2', type: 'image', position: { x: 0, y: 0 }, data: { title: '图片 3' } },
    ]
    expect(nextDefaultNodeTitle('image', nodes)).toBe('图片 4')
  })

  it('keeps existing title in withDefaultNodeTitle', () => {
    const data = withDefaultNodeTitle('image', [], { title: '自定义' })
    expect(data.title).toBe('自定义')
  })
})
