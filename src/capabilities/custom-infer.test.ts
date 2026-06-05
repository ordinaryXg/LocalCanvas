import { describe, expect, it } from 'vitest'
import { inferProfileFromCustomConfig } from './custom-infer'

describe('inferProfileFromCustomConfig', () => {
  it('detects reference images from template', () => {
    const profile = inferProfileFromCustomConfig('image', 'my-img', 'Test', {
      customConfig: {
        endpoint: 'https://api.example.com/v1/images',
        method: 'POST',
        request_template: {
          prompt: '{{prompt}}',
          image_urls: ['{{reference_image}}'],
        },
        response_mapping: { output_url: 'data.url' },
      },
    })
    expect(profile.inputs.some((s) => s.id === 'reference_image')).toBe(true)
    expect(profile.confidence).toBe('inferred')
  })

  it('detects llm vision from messages template', () => {
    const profile = inferProfileFromCustomConfig('llm', 'my-llm', 'Vision', {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      customConfig: {
        endpoint: 'https://api.example.com/v1/chat/completions',
        method: 'POST',
        request_template: {
          messages: [{ role: 'user', content: [{ type: 'image_url', image_url: '{{image}}' }] }],
        },
        response_mapping: { text: 'choices[0].message.content' },
      },
    })
    expect(profile.inputs.some((s) => s.id === 'image')).toBe(true)
  })

  it('detects video frames and poll async output', () => {
    const profile = inferProfileFromCustomConfig('video', 'my-vid', 'Vid', {
      customConfig: {
        endpoint: 'https://api.example.com/video',
        method: 'POST',
        request_template: {
          prompt: '{{prompt}}',
          first_frame: '{{first_frame}}',
          last_frame: '{{last_frame}}',
        },
        response_mapping: { output_url: 'url', status: 'status' },
        poll_config: { enabled: true, interval_ms: 2000, completion_status: 'done' },
      },
    })
    expect(profile.inputs.map((s) => s.id)).toEqual(
      expect.arrayContaining(['first_frame', 'last_frame']),
    )
    expect(profile.outputs[0]?.async).toBe(true)
  })
})
