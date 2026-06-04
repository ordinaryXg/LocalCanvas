import { describe, it, expect } from 'vitest'
import { parseScriptResponse } from './scriptGenerator'

describe('parseScriptResponse', () => {
  it('parses plain JSON', () => {
    const json = JSON.stringify({
      title: '测试脚本',
      rows: [{ sequence: 1, description: '开场', prompt: 'opening scene', duration: 5, camera: '静止' }],
    })
    const result = parseScriptResponse(json)
    expect(result.title).toBe('测试脚本')
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].prompt).toBe('opening scene')
  })

  it('strips markdown code fences', () => {
    const wrapped = '```json\n{"title":"T","rows":[{"sequence":1,"description":"d","prompt":"p","duration":8,"camera":"推近"}]}\n```'
    const result = parseScriptResponse(wrapped)
    expect(result.rows[0].duration).toBe(8)
    expect(result.rows[0].camera).toBe('推近')
  })

  it('clamps duration to 4-15', () => {
    const json = JSON.stringify({
      title: 'T',
      rows: [{ sequence: 1, description: '', prompt: '', duration: 99, camera: '' }],
    })
    const result = parseScriptResponse(json)
    expect(result.rows[0].duration).toBe(15)
  })

  it('throws on invalid payload', () => {
    expect(() => parseScriptResponse('{"title":"x"}')).toThrow()
  })
})
