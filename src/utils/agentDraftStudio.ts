export interface AgentBriefDraft {
  filmType: string
  durationSec?: number
  aspectRatio?: string
  tone: string
  mustInclude: string
}

export interface AgentShotDraft {
  sequence: number
  beat: string
  durationSec: number
  mode: 'i2v' | 't2v' | 'flf'
  summary: string
}

const ASPECT_PATTERNS = [
  /9\s*[:：]\s*16|竖屏|vertical/i,
  /16\s*[:：]\s*9|横屏|landscape/i,
  /1\s*[:：]\s*1|方形|square/i,
]

export function parseBriefFromIntent(intent: string): AgentBriefDraft {
  const lower = intent.toLowerCase()
  let durationSec: number | undefined
  const secMatch = intent.match(/(\d+)\s*秒/)
  const minMatch = intent.match(/(\d+)\s*分钟/)
  if (secMatch) durationSec = Number(secMatch[1])
  else if (minMatch) durationSec = Number(minMatch[1]) * 60

  let aspectRatio = '16:9'
  if (ASPECT_PATTERNS[0].test(intent)) aspectRatio = '9:16'
  else if (ASPECT_PATTERNS[2].test(intent)) aspectRatio = '1:1'

  let filmType = '叙事短片'
  if (/品牌|广告|promo|commercial/i.test(intent)) filmType = '品牌广告片'
  else if (/空镜|产品|broll|montage/i.test(intent)) filmType = '产品空镜'
  else if (/故事|电影|film|narrative/i.test(intent)) filmType = '叙事短片'

  const tone =
    /电影感|cinematic/i.test(intent)
      ? '电影感'
      : /温暖|治愈/i.test(intent)
        ? '温暖'
        : /科技|冷色/i.test(intent)
          ? '科技感'
          : '自然纪实'

  return {
    filmType,
    durationSec,
    aspectRatio,
    tone,
    mustInclude: intent.slice(0, 120),
  }
}

export function buildDraftShotList(intent: string, brief: AgentBriefDraft): AgentShotDraft[] {
  const total = brief.durationSec ?? 30
  const count = total > 90 ? 6 : total > 45 ? 5 : 4
  const perShot = Math.max(3, Math.floor(total / count))
  const beats = ['HOOK', 'HERO', 'HERO', 'DETAIL', 'CTA', 'OUTRO']
  const snippets = intent
    .split(/[，,。；;]/)
    .map((s) => s.trim())
    .filter(Boolean)

  return Array.from({ length: count }, (_, i) => ({
    sequence: i + 1,
    beat: beats[i] ?? 'BEAT',
    durationSec: i === count - 1 ? Math.max(3, total - perShot * (count - 1)) : perShot,
    mode: 'i2v' as const,
    summary: snippets[i] ?? `${brief.filmType} 镜头 ${i + 1}`,
  }))
}
