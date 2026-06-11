import { describe, it, expect } from 'vitest'
import {
  briefToCreativeBibleEntries,
  injectCreativeBibleIntoPrompt,
  mergeCreativeBibleEntries,
} from './creativeBible'

describe('creativeBible', () => {
  it('builds entries from production brief', () => {
    const entries = briefToCreativeBibleEntries({
      title: '咖啡品牌',
      filmType: '品牌广告片',
      targetDurationSec: 30,
      aspectRatio: '9:16',
      tone: '电影感',
      mustInclude: '咖啡拉花特写',
    })
    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].lockedPromptPrefix).toContain('电影感')
  })

  it('injects prefix into prompt', () => {
    const prompt = injectCreativeBibleIntoPrompt('产品特写', [
      {
        id: 'b1',
        kind: 'product',
        name: '咖啡机',
        visualDescription: '银色机身',
        lockedPromptPrefix: '[产品] 银色机身',
      },
    ])
    expect(prompt).toContain('[创意圣经]')
    expect(prompt).toContain('产品特写')
  })

  it('merges entries by kind and name', () => {
    const merged = mergeCreativeBibleEntries(
      [{ id: '1', kind: 'product', name: 'A', visualDescription: 'old' }],
      [{ id: '2', kind: 'product', name: 'A', visualDescription: 'new' }],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0].visualDescription).toBe('new')
  })
})
