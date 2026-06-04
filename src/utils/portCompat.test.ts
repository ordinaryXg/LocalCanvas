import { describe, it, expect } from 'vitest'
import { isPortCompatible, getNodeTypeFromId } from './portCompat'

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
})

describe('getNodeTypeFromId', () => {
  it('returns node type by id', () => {
    expect(getNodeTypeFromId([{ id: 'a', type: 'video' }], 'a')).toBe('video')
    expect(getNodeTypeFromId([{ id: 'a', type: 'video' }], 'b')).toBeUndefined()
  })
})
