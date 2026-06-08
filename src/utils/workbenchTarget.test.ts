import { describe, expect, it } from 'vitest'
import { resolveWorkbenchTarget } from './workbenchTarget'

describe('resolveWorkbenchTarget', () => {
  const nodes = [
    { id: 'v1', type: 'video' },
    { id: 'c1', type: 'compose' },
  ]

  it('prefers selected compose', () => {
    const t = resolveWorkbenchTarget(nodes, ['c1'])
    expect(t?.kind).toBe('compose')
    expect(t?.nodeId).toBe('c1')
  })

  it('prefers selected generatable', () => {
    const t = resolveWorkbenchTarget(nodes, ['v1'])
    expect(t?.kind).toBe('generate')
    expect(t?.nodeId).toBe('v1')
  })

  it('compose wins when both selected', () => {
    const t = resolveWorkbenchTarget(nodes, ['v1', 'c1'])
    expect(t?.kind).toBe('compose')
    expect(t?.nodeId).toBe('c1')
  })
})
