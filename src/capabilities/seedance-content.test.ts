import { describe, expect, it } from 'vitest'
import { buildSeedanceContent } from './seedance-content'

describe('buildSeedanceContent', () => {
  it('adds roles for seedance 2.0', () => {
    const content = buildSeedanceContent({
      promptText: 'test',
      isV2: true,
      firstFrame: 'data:image/png;base64,aa',
      referenceImages: ['data:image/png;base64,bb'],
      referenceVideo: 'https://example.com/v.mp4',
      referenceAudio: 'https://example.com/a.mp3',
    })
    expect(content).toHaveLength(5)
    expect(content[1]).toMatchObject({ role: 'first_frame' })
    expect(content[2]).toMatchObject({ role: 'reference_image' })
    expect(content[3]).toMatchObject({ role: 'reference_video' })
    expect(content[4]).toMatchObject({ role: 'reference_audio' })
  })

  it('omits roles for seedance 1.0', () => {
    const content = buildSeedanceContent({
      promptText: 'test',
      isV2: false,
      firstFrame: 'data:image/png;base64,aa',
    })
    expect(content[1].role).toBeUndefined()
  })
})
