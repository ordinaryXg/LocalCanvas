import { describe, expect, it } from 'vitest'
import { extractJsonFromLlm, parseLlmJson } from './parse-llm-json'

describe('parseLlmJson', () => {
  it('parses fenced json', () => {
    const raw = 'Here:\n```json\n{"metaphor":"rain","arousal":0.3}\n```\nDone'
    const r = parseLlmJson<{ metaphor: string }>(raw)
    expect(r?.metaphor).toBe('rain')
  })

  it('parses first object when extra text follows', () => {
    const raw = '{"a":1}\n\nSome explanation'
    const json = extractJsonFromLlm(raw)
    expect(json).toBe('{"a":1}')
  })
})
