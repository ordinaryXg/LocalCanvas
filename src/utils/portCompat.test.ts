import { describe, it, expect } from 'vitest'
import { isPortCompatible, getNodeTypeFromId, isTargetHandleAvailable } from './portCompat'

describe('isPortCompatible', () => {
  it('allows text prompt to image prompt', () => {
    expect(isPortCompatible('text', 'prompt', 'image', 'prompt')).toBe(true)
  })

  it('allows image firstFrame to video firstFrame', () => {
    expect(isPortCompatible('image', 'firstFrame', 'video', 'firstFrame')).toBe(true)
  })

  it('rejects incompatible ports', () => {
    expect(isPortCompatible('audio', 'audio', 'image', 'prompt')).toBe(false)
  })

  it('rejects missing handles', () => {
    expect(isPortCompatible('text', null, 'image', 'prompt')).toBe(false)
  })

  it('allows script to image prompt', () => {
    expect(isPortCompatible('script', 'script', 'image', 'prompt')).toBe(true)
  })

  it('allows script to video prompt', () => {
    expect(isPortCompatible('script', 'script', 'video', 'prompt')).toBe(true)
  })
})

describe('isTargetHandleAvailable', () => {
  it('rejects duplicate target handle', () => {
    const edges = [
      {
        id: 'e1',
        source: 'i1',
        target: 'v1',
        sourceHandle: 'firstFrame',
        targetHandle: 'firstFrame',
      },
    ]
    expect(isTargetHandleAvailable(edges, 'v1', 'firstFrame')).toBe(false)
    expect(isTargetHandleAvailable(edges, 'v1', 'lastFrame')).toBe(true)
  })
})

describe('getNodeTypeFromId', () => {
  it('returns node type by id', () => {
    expect(getNodeTypeFromId([{ id: 'a', type: 'video' }], 'a')).toBe('video')
    expect(getNodeTypeFromId([{ id: 'a', type: 'video' }], 'b')).toBeUndefined()
  })
})
