import { describe, expect, it } from 'vitest'
import {
  buildTextNodeGeneratePrompt,
  coerceSinglePromptOutput,
  injectTextNodePromptConstraints,
  resolveTextNodeSystemPrompt,
  TEXT_NODE_IMAGE_PROMPT_SYSTEM,
  textNodeFeedsVisualPrompt,
} from './textPromptConstraints'

describe('textPromptConstraints', () => {
  it('detects text → image prompt edge', () => {
    expect(
      textNodeFeedsVisualPrompt('t1', [
        { source: 't1', sourceHandle: 'prompt', targetHandle: 'prompt' },
      ]),
    ).toBe(true)
    expect(textNodeFeedsVisualPrompt('t1', [])).toBe(false)
  })

  it('defaults to prompt engineer system prompt without custom override', () => {
    expect(resolveTextNodeSystemPrompt('t1', [])).toBe(TEXT_NODE_IMAGE_PROMPT_SYSTEM)
    const edges = [{ source: 't1', sourceHandle: 'prompt', targetHandle: 'prompt' }]
    expect(resolveTextNodeSystemPrompt('t1', edges)).toBe(TEXT_NODE_IMAGE_PROMPT_SYSTEM)
    expect(resolveTextNodeSystemPrompt('t1', edges, 'custom')).toBe('custom')
  })

  it('injects systemPrompt on planned text nodes', () => {
    const nodes = injectTextNodePromptConstraints(
      [{ type: 'text', tempId: 't1', data: { draft: '咖啡广告' } }],
      [{ source: 't1', sourceHandle: 'prompt', target: 'i1', targetHandle: 'prompt' }],
    )
    expect(nodes[0].data.systemPrompt).toBe(TEXT_NODE_IMAGE_PROMPT_SYSTEM)
  })

  it('coerceSinglePromptOutput keeps english prompt over meta intro', () => {
    const raw = `这是一份为你准备的 AI 短片提示词合集。你可以直接复制使用（主要针对 Runway、Pika 等工具）。
Dynamic kung fu fight scene, two martial artists in bamboo forest, cinematic wide shot, slow motion kicks, dust particles, golden hour lighting, 35mm film grain`
    expect(coerceSinglePromptOutput(raw)).toMatch(/kung fu/i)
    expect(coerceSinglePromptOutput(raw)).not.toMatch(/合集/)
  })

  it('coerceSinglePromptOutput picks substantial line over numbered options', () => {
    const raw = `方案一：cinematic coffee ad
方案二：minimal product shot
A premium coffee brand commercial, warm lighting, shallow depth of field`
    expect(coerceSinglePromptOutput(raw)).toContain('premium coffee')
  })

  it('buildTextNodeGeneratePrompt reinforces task framing', () => {
    const prompt = buildTextNodeGeneratePrompt('中国功夫打斗场面短片提示词')
    expect(prompt).toContain('中国功夫打斗场面短片提示词')
    expect(prompt).toContain('唯一一条')
  })
})
