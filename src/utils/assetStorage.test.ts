import { describe, it, expect } from 'vitest'
import { mimeFromAssetPath, stripTransientMediaFields } from './assetStorage'

describe('assetStorage', () => {
  it('mimeFromAssetPath resolves common extensions', () => {
    expect(mimeFromAssetPath('images/a.png')).toBe('image/png')
    expect(mimeFromAssetPath('videos/clip.mp4')).toBe('video/mp4')
    expect(mimeFromAssetPath('audios/x.wav')).toBe('audio/wav')
  })

  it('stripTransientMediaFields removes blob URLs only', () => {
    const out = stripTransientMediaFields({
      imageAssetPath: 'images/a.png',
      imageSrc: 'blob:http://localhost/x',
      prompt: 'hello',
    })
    expect(out.imageAssetPath).toBe('images/a.png')
    expect(out.prompt).toBe('hello')
    expect(out).not.toHaveProperty('imageSrc')
  })

  it('stripTransientMediaFields strips storyboard frame blob URLs', () => {
    const out = stripTransientMediaFields({
      frames: [
        {
          id: 'f1',
          sequence: 1,
          imagePath: 'images/frame.png',
          imageSrc: 'blob:http://localhost/y',
        },
      ],
    })
    const frames = out.frames as Array<Record<string, unknown>>
    expect(frames[0].imagePath).toBe('images/frame.png')
    expect(frames[0]).not.toHaveProperty('imageSrc')
  })
})
