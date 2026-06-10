import { describe, expect, it } from 'vitest'
import { attachCustomVisionImages } from './custom-vision-request'

describe('attachCustomVisionImages', () => {
  it('injects images when template body has no images field', () => {
    const body: Record<string, unknown> = { prompt: 'describe' }
    attachCustomVisionImages(body, ['data:image/png;base64,abc'])
    expect(body.images).toEqual(['data:image/png;base64,abc'])
  })

  it('does not override template-defined images', () => {
    const body: Record<string, unknown> = { images: ['{{image}}'] }
    attachCustomVisionImages(body, ['data:image/png;base64,abc'])
    expect(body.images).toEqual(['{{image}}'])
  })

  it('no-ops when images array is empty', () => {
    const body: Record<string, unknown> = { prompt: 'x' }
    attachCustomVisionImages(body, [])
    expect(body.images).toBeUndefined()
  })
})
