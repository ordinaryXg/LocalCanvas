import { describe, it, expect } from 'vitest'
import { classifyFilmTrack, parseDurationSec } from './filmTypeClassifier'

describe('filmTypeClassifier', () => {
  it('parses duration from intent', () => {
    expect(parseDurationSec('30 秒品牌片')).toBe(30)
    expect(parseDurationSec('2 分钟叙事')).toBe(120)
  })

  it('classifies 30s brand intent as studio', () => {
    const result = classifyFilmTrack('30 秒咖啡品牌广告，竖屏，多镜头')
    expect(result.track).toBe('studio')
    expect(result.scoreStudio).toBeGreaterThan(result.scoreLite)
  })

  it('classifies 5s broll as lite', () => {
    const result = classifyFilmTrack('5 秒产品空镜，单镜头')
    expect(result.track).toBe('lite')
  })

  it('respects defaultTrack override', () => {
    expect(classifyFilmTrack('30 秒品牌', 'lite').track).toBe('lite')
    expect(classifyFilmTrack('5 秒空镜', 'studio').track).toBe('studio')
  })
})
