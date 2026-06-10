import { describe, it, expect } from 'vitest'
import { parseBriefFromIntent, buildDraftShotList } from './agentDraftStudio'

describe('agentDraftStudio', () => {
  it('parses duration, aspect and film type from intent', () => {
    const brief = parseBriefFromIntent('30 秒咖啡品牌广告，竖屏，电影感')
    expect(brief.durationSec).toBe(30)
    expect(brief.aspectRatio).toBe('9:16')
    expect(brief.filmType).toBe('品牌广告片')
    expect(brief.tone).toBe('电影感')
    expect(brief.mustInclude).toContain('咖啡')
  })

  it('builds draft shot list from brief duration', () => {
    const brief = parseBriefFromIntent('45 秒叙事短片')
    const shots = buildDraftShotList('开场特写，主角登场', brief)
    expect(shots.length).toBeGreaterThanOrEqual(4)
    expect(shots[0].sequence).toBe(1)
    expect(shots.reduce((s, x) => s + x.durationSec, 0)).toBeGreaterThanOrEqual(40)
  })
})
