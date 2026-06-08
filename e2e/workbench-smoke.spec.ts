import { test, expect } from '@playwright/test'
import { resolveWorkbenchTarget } from '../src/utils/workbenchTarget'

test.describe('workbench routing smoke', () => {
  const nodes = [
    { id: 'img-1', type: 'image' },
    { id: 'vid-1', type: 'video' },
    { id: 'cmp-1', type: 'compose' },
  ]

  test('prefers selected compose node over generatable selection', () => {
    const target = resolveWorkbenchTarget(nodes, ['img-1', 'cmp-1'], null)
    expect(target).toEqual({
      kind: 'compose',
      nodeId: 'cmp-1',
      nodeType: 'compose',
    })
  })

  test('routes generatable node to generate workbench', () => {
    const target = resolveWorkbenchTarget(nodes, ['vid-1'], null)
    expect(target).toEqual({
      kind: 'generate',
      nodeId: 'vid-1',
      nodeType: 'video',
    })
  })

  test('falls back to active compose when selection is empty', () => {
    const target = resolveWorkbenchTarget(nodes, [], 'cmp-1')
    expect(target).toEqual({
      kind: 'compose',
      nodeId: 'cmp-1',
      nodeType: 'compose',
      fallback: true,
    })
  })
})
