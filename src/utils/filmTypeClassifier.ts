import type { ProductionTrack } from '../types/agent'

export interface FilmTrackResult {
  track: ProductionTrack
  scoreStudio: number
  scoreLite: number
  durationSec?: number
}

const MULTI_SHOT_KEYWORDS =
  /多镜头|分镜|storyboard|多个镜头|镜头表|场景|beats?|shots?/i
const BRAND_NARRATIVE_KEYWORDS =
  /品牌|广告|promo|commercial|故事|叙事|narrative|短片|film|电影/i
const SINGLE_SHOT_KEYWORDS = /单镜头|一键|空镜|broll|montage|产品空镜|5\s*秒/i
const EXPLICIT_STORYBOARD = /分镜|storyboard|镜头表/i

export function parseDurationSec(intent: string): number | undefined {
  const secMatch = intent.match(/(\d+)\s*秒/)
  if (secMatch) return Number(secMatch[1])
  const minMatch = intent.match(/(\d+)\s*分钟/)
  if (minMatch) return Number(minMatch[1]) * 60
  return undefined
}

export function classifyFilmTrack(
  intent: string,
  defaultTrack: 'auto' | 'lite' | 'studio' = 'auto',
): FilmTrackResult {
  if (defaultTrack === 'lite') {
    return { track: 'lite', scoreStudio: 0, scoreLite: 99, durationSec: parseDurationSec(intent) }
  }
  if (defaultTrack === 'studio') {
    return { track: 'studio', scoreStudio: 99, scoreLite: 0, durationSec: parseDurationSec(intent) }
  }

  const durationSec = parseDurationSec(intent)
  const mentionsDuration = durationSec !== undefined

  let scoreStudio = 0
  let scoreLite = 0

  if (mentionsDuration && durationSec! > 12) scoreStudio += 2
  if (MULTI_SHOT_KEYWORDS.test(intent)) scoreStudio += 2
  if (BRAND_NARRATIVE_KEYWORDS.test(intent)) scoreStudio += 1
  if (EXPLICIT_STORYBOARD.test(intent)) scoreStudio += 2

  if (SINGLE_SHOT_KEYWORDS.test(intent)) scoreLite += 2
  if (mentionsDuration && durationSec! <= 12) scoreLite += 1

  const track: ProductionTrack =
    scoreStudio >= 3 && scoreStudio > scoreLite ? 'studio' : 'lite'

  return { track, scoreStudio, scoreLite, durationSec }
}

export const STUDIO_TEMPLATE_IDS = [
  'brand-spot-30s',
  'narrative-short',
  'product-demo',
  'montage-broll',
  'script-to-film',
] as const

export function isStudioTemplateId(id: string): boolean {
  return (STUDIO_TEMPLATE_IDS as readonly string[]).includes(id)
}
