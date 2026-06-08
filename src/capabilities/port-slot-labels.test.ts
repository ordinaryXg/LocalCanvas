import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import {
  getImagePortSlotLabels,
  getTextPortSlotLabels,
  getVideoPortSlotLabels,
} from './port-slot-labels'

function edge(target: string, handle: string): Edge {
  return {
    id: `e-${handle}`,
    source: 'src',
    target,
    targetHandle: handle,
  } as Edge
}

describe('port-slot-labels', () => {
  it('video seedance 2.0 aggregates reference image count', () => {
    const labels = getVideoPortSlotLabels('vid', [
      edge('vid', 'reference1'),
      edge('vid', 'reference3'),
    ], 'seedance-2-0')
    expect(labels.reference1).toBe('2/9')
    expect(labels.firstFrame).toBe('0/1')
  })

  it('image shows reference slot', () => {
    const labels = getImagePortSlotLabels('img', [edge('img', 'reference')], 'seedream-4-5')
    expect(labels.reference).toBe('1/1')
  })

  it('text gpt-4o shows vision aggregate', () => {
    const labels = getTextPortSlotLabels('txt', [edge('txt', 'image1')], 'gpt-4o')
    expect(labels.image1).toBe('1/10')
  })

  it('deepseek text has no vision labels', () => {
    expect(getTextPortSlotLabels('txt', [], 'deepseek-v4-flash')).toEqual({})
  })
})
