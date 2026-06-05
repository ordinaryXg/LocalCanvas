import { describe, expect, it } from 'vitest'
import { buildVisionUserContent } from './llm-vision-content'

describe('buildVisionUserContent', () => {
  it('returns plain string without images', () => {
    expect(buildVisionUserContent('hello')).toBe('hello')
  })

  it('builds image_url parts before text', () => {
    const content = buildVisionUserContent('describe', ['data:a', 'https://b'])
    expect(content).toEqual([
      { type: 'image_url', image_url: { url: 'data:a' } },
      { type: 'image_url', image_url: { url: 'https://b' } },
      { type: 'text', text: 'describe' },
    ])
  })
})
