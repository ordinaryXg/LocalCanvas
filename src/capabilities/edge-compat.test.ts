import { describe, expect, it } from 'vitest'
import { evaluateEdgeCompat } from './edge-compat'

describe('evaluateEdgeCompat', () => {
  it('allows text to image prompt as solid', () => {
    const r = evaluateEdgeCompat({
      sourceType: 'text',
      sourceHandle: 'prompt',
      targetType: 'image',
      targetHandle: 'prompt',
      targetModelId: 'seedream-4-5',
      targetKind: 'image',
    })
    expect(r.status).toBe('solid')
  })

  it('allows text to image prompt as solid when image has no modelId', () => {
    const r = evaluateEdgeCompat({
      sourceType: 'text',
      sourceHandle: 'prompt',
      targetType: 'image',
      targetHandle: 'prompt',
      targetKind: 'image',
    })
    expect(r.status).toBe('solid')
  })

  it('warns image to deepseek llm', () => {
    const r = evaluateEdgeCompat({
      sourceType: 'image',
      sourceHandle: 'image',
      targetType: 'text',
      targetHandle: 'image',
      targetModelId: 'deepseek-v4-flash',
      targetKind: 'llm',
    })
    expect(r.status).toBe('dashed_warn')
  })

  it('allows image to gpt-4o as solid', () => {
    const r = evaluateEdgeCompat({
      sourceType: 'image',
      sourceHandle: 'image',
      targetType: 'text',
      targetHandle: 'image',
      targetModelId: 'gpt-4o',
      targetKind: 'llm',
    })
    expect(r.status).toBe('solid')
  })

  it('warns lastFrame to seedance 1.0', () => {
    const r = evaluateEdgeCompat({
      sourceType: 'image',
      sourceHandle: 'image',
      targetType: 'video',
      targetHandle: 'lastFrame',
      targetModelId: 'seedance-1-0-pro-fast',
      targetKind: 'video',
    })
    expect(r.status).toBe('dashed_warn')
  })

  it('allows lastFrame to seedance 2.0', () => {
    const r = evaluateEdgeCompat({
      sourceType: 'image',
      sourceHandle: 'image',
      targetType: 'video',
      targetHandle: 'lastFrame',
      targetModelId: 'seedance-2-0',
      targetKind: 'video',
    })
    expect(r.status).toBe('solid')
  })

  it('allows reference image to seedance 2.0', () => {
    const r = evaluateEdgeCompat({
      sourceType: 'image',
      sourceHandle: 'image',
      targetType: 'video',
      targetHandle: 'reference1',
      targetModelId: 'seedance-2-0',
      targetKind: 'video',
    })
    expect(r.status).toBe('solid')
  })

  it('allows multi vision images to gpt-4o', () => {
    const r = evaluateEdgeCompat({
      sourceType: 'image',
      sourceHandle: 'image',
      targetType: 'text',
      targetHandle: 'image2',
      targetModelId: 'gpt-4o',
      targetKind: 'llm',
    })
    expect(r.status).toBe('solid')
  })

  it('warns when vision image slots are full on gpt-4o', () => {
    const edges = Array.from({ length: 10 }, (_, i) => ({
      id: `e${i}`,
      source: `img${i}`,
      target: 't1',
      sourceHandle: 'image',
      targetHandle: `image${i + 1}`,
    }))
    const r = evaluateEdgeCompat({
      sourceType: 'image',
      sourceHandle: 'image',
      targetType: 'text',
      targetHandle: 'image1',
      targetModelId: 'gpt-4o',
      targetKind: 'llm',
      edges,
      targetNodeId: 't1',
    })
    expect(r.status).toBe('dashed_warn')
    expect(r.reason).toContain('已满')
  })

  it('warns when reference image slots are full on seedance 2.0', () => {
    const edges = Array.from({ length: 9 }, (_, i) => ({
      id: `e${i}`,
      source: `img${i}`,
      target: 'v1',
      sourceHandle: 'image',
      targetHandle: `reference${i + 1}`,
    }))
    const r = evaluateEdgeCompat({
      sourceType: 'image',
      sourceHandle: 'image',
      targetType: 'video',
      targetHandle: 'reference1',
      targetModelId: 'seedance-2-0',
      targetKind: 'video',
      edges,
      targetNodeId: 'v1',
    })
    expect(r.status).toBe('dashed_warn')
    expect(r.reason).toContain('已满')
  })
})
