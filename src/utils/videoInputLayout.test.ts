import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import {
  listVideoImageInputs,
  reassignVideoImageRole,
  resolveVideoInputModes,
  VIDEO_IMAGE_INBOX_HANDLE,
} from './videoInputLayout'
import { getVideoGeneratorUi } from '../capabilities/generator-ui'

describe('resolveVideoInputModes', () => {
  it('defaults firstLast from model capability', () => {
    const ui = getVideoGeneratorUi('seedance-2-0')
    const modes = resolveVideoInputModes(undefined, [], 'v1', ui)
    expect(modes.firstLast).toBe(true)
    expect(modes.reference).toBe(false)
  })

  it('enables reference mode when reference edges exist', () => {
    const ui = getVideoGeneratorUi('seedance-2-0')
    const edges = [{ id: 'e1', source: 'i1', target: 'v1', targetHandle: 'reference1' }] as Edge[]
    const modes = resolveVideoInputModes(undefined, edges, 'v1', ui)
    expect(modes.reference).toBe(true)
  })
})

describe('listVideoImageInputs', () => {
  it('groups edges by role', () => {
    const edges = [
      { id: 'e1', source: 'i1', target: 'v1', targetHandle: VIDEO_IMAGE_INBOX_HANDLE },
      { id: 'e2', source: 'i2', target: 'v1', targetHandle: 'firstFrame' },
      { id: 'e3', source: 'i3', target: 'v1', targetHandle: 'reference2' },
    ] as Edge[]
    const groups = listVideoImageInputs('v1', edges)
    expect(groups.inbox).toHaveLength(1)
    expect(groups.firstFrame?.id).toBe('e2')
    expect(groups.references).toHaveLength(1)
  })
})

describe('reassignVideoImageRole', () => {
  const edges = [
    { id: 'e1', source: 'i1', target: 'v1', targetHandle: VIDEO_IMAGE_INBOX_HANDLE },
    { id: 'e2', source: 'i2', target: 'v1', targetHandle: 'firstFrame' },
  ] as Edge[]

  it('moves edge to new handle', () => {
    const next = reassignVideoImageRole(edges, 'e1', 'lastFrame', 'v1')
    expect(next.find((e) => e.id === 'e1')?.targetHandle).toBe('lastFrame')
  })

  it('swaps when target slot occupied', () => {
    const next = reassignVideoImageRole(edges, 'e1', 'firstFrame', 'v1')
    expect(next.find((e) => e.id === 'e1')?.targetHandle).toBe('firstFrame')
    expect(next.find((e) => e.id === 'e2')?.targetHandle).toBe(VIDEO_IMAGE_INBOX_HANDLE)
  })
})
