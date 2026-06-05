import { describe, expect, it } from 'vitest'
import { getImageGeneratorUi, getVideoGeneratorUi, listUnsupportedInboundSlots } from './generator-ui'

describe('getVideoGeneratorUi', () => {
  it('seedance 1.0 has first frame but no last frame', () => {
    const ui = getVideoGeneratorUi('seedance-1-0-pro-fast')
    expect(ui.supportsFirstFrame).toBe(true)
    expect(ui.supportsLastFrame).toBe(false)
    expect(ui.supportsGenerateAudio).toBe(false)
  })

  it('seedance 2.0 has last frame and reference images', () => {
    const ui = getVideoGeneratorUi('seedance-2-0')
    expect(ui.supportsLastFrame).toBe(true)
    expect(ui.supportsReferenceImage).toBe(true)
    expect(ui.maxReferenceImages).toBe(9)
    expect(ui.supportsGenerateAudio).toBe(true)
  })
})

describe('getImageGeneratorUi', () => {
  it('seedream supports reference images', () => {
    const ui = getImageGeneratorUi('seedream-4-5')
    expect(ui.supportsReferenceImage).toBe(true)
  })

  it('dall-e-3 is prompt only', () => {
    const ui = getImageGeneratorUi('dall-e-3')
    expect(ui.supportsReferenceImage).toBe(false)
  })
})

describe('listUnsupportedInboundSlots', () => {
  it('flags last frame on seedance 1.0', () => {
    const ui = getVideoGeneratorUi('seedance-1-0-pro-fast')
    const msgs = listUnsupportedInboundSlots(ui, ['lastFrame'])
    expect(msgs.some((m) => m.includes('尾帧'))).toBe(true)
  })
})
