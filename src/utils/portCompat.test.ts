import { describe, it, expect } from 'vitest'
import {
  isPortCompatible,
  getNodeTypeFromId,
  isTargetHandleAvailable,
  migrateImageOutputEdges,
  normalizeImageSourceHandle,
} from './portCompat'

describe('isPortCompatible', () => {
  it('allows text prompt to image prompt', () => {
    expect(isPortCompatible('text', 'prompt', 'image', 'prompt')).toBe(true)
  })

  it('allows image output to video firstFrame', () => {
    expect(isPortCompatible('image', 'image', 'video', 'firstFrame')).toBe(true)
  })

  it('allows image output to video lastFrame', () => {
    expect(isPortCompatible('image', 'image', 'video', 'lastFrame')).toBe(true)
  })

  it('allows image output to image reference input', () => {
    expect(isPortCompatible('image', 'image', 'image', 'reference')).toBe(true)
  })

  it('supports legacy image firstFrame source handle', () => {
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

describe('normalizeImageSourceHandle', () => {
  it('maps legacy output handles to image', () => {
    expect(normalizeImageSourceHandle('image', 'firstFrame')).toBe('image')
    expect(normalizeImageSourceHandle('image', 'lastFrame')).toBe('image')
    expect(normalizeImageSourceHandle('image', 'reference')).toBe('image')
  })

  it('leaves non-image handles unchanged', () => {
    expect(normalizeImageSourceHandle('text', 'prompt')).toBe('prompt')
    expect(normalizeImageSourceHandle('image', 'image')).toBe('image')
  })
})

describe('isTargetHandleAvailable', () => {
  it('rejects duplicate target handle', () => {
    const edges = [
      {
        id: 'e1',
        source: 'i1',
        target: 'v1',
        sourceHandle: 'image',
        targetHandle: 'firstFrame',
      },
    ]
    expect(isTargetHandleAvailable(edges, 'v1', 'firstFrame')).toBe(false)
    expect(isTargetHandleAvailable(edges, 'v1', 'lastFrame')).toBe(true)
  })

  it('allows same source to fan out to multiple targets', () => {
    const edges = [
      {
        id: 'e1',
        source: 't1',
        target: 'i1',
        sourceHandle: 'prompt',
        targetHandle: 'prompt',
      },
    ]
    expect(isTargetHandleAvailable(edges, 'i2', 'prompt')).toBe(true)
    expect(isTargetHandleAvailable(edges, 'v1', 'prompt')).toBe(true)
    expect(isPortCompatible('text', 'prompt', 'image', 'prompt')).toBe(true)
    expect(isPortCompatible('text', 'prompt', 'video', 'prompt')).toBe(true)
  })
})

describe('migrateImageOutputEdges', () => {
  it('rewrites legacy image source handles on load', () => {
    const nodes = [{ id: 'i1', type: 'image' }]
    const edges = [
      {
        id: 'e1',
        source: 'i1',
        target: 'v1',
        sourceHandle: 'firstFrame',
        targetHandle: 'firstFrame',
      },
    ]
    const migrated = migrateImageOutputEdges(nodes, edges)
    expect(migrated[0].sourceHandle).toBe('image')
  })
})

describe('getNodeTypeFromId', () => {
  it('returns node type by id', () => {
    expect(getNodeTypeFromId([{ id: 'a', type: 'video' }], 'a')).toBe('video')
    expect(getNodeTypeFromId([{ id: 'a', type: 'video' }], 'b')).toBeUndefined()
  })
})
