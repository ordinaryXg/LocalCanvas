import type { AgentSkill, SkillContext } from './types'
import { textToVideoSkill } from './text-to-video'
import { scriptToFilmSkill } from './script-to-film'
import { firstLastFrameSkill } from './first-last-frame'
import { brandSpot30sSkill } from './brand-spot-30s'
import { narrativeShortSkill } from './narrative-short'
import { productDemoSkill } from './product-demo'
import { montageBrollSkill } from './montage-broll'
import type { WorkflowPlan } from '../../../../../src/types/agent'
import {
  classifyFilmTrack,
  isStudioTemplateId,
} from '../../../../../src/utils/filmTypeClassifier'

export const BUILTIN_SKILLS: AgentSkill[] = [
  brandSpot30sSkill,
  narrativeShortSkill,
  productDemoSkill,
  montageBrollSkill,
  scriptToFilmSkill,
  textToVideoSkill,
  firstLastFrameSkill,
]

export const STUDIO_PRODUCTION_TEMPLATE_IDS = [
  'brand-spot-30s',
  'narrative-short',
  'product-demo',
  'montage-broll',
] as const

export function listSkills(): Array<{ id: string; name: string; description: string }> {
  return BUILTIN_SKILLS.map((s) => ({ id: s.id, name: s.name, description: s.description }))
}

export function matchSkill(intent: string, disabledSkills: string[] = []): AgentSkill | null {
  const ranked = rankSkillsForIntent(intent, disabledSkills)
  return ranked[0]?.skill ?? null
}

export interface RankedSkill {
  skill: AgentSkill
  score: number
}

export function rankSkillsForIntent(
  intent: string,
  disabledSkills: string[] = [],
  defaultTrack: 'auto' | 'lite' | 'studio' = 'auto',
): RankedSkill[] {
  const lower = intent.toLowerCase()
  const track = classifyFilmTrack(intent, defaultTrack)
  const scored: RankedSkill[] = []

  for (const skill of BUILTIN_SKILLS) {
    if (disabledSkills.includes(skill.id)) continue
    if (track.track === 'studio' && skill.id === 'text-to-video') continue
    if (!skill.triggers?.length) continue
    let score = 0
    for (const trigger of skill.triggers) {
      if (lower.includes(trigger.toLowerCase())) score += 1
    }
    if (track.track === 'studio' && isStudioTemplateId(skill.id)) score += 2
    if (score > 0) scored.push({ skill, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored
}

export function buildSkillPlan(skillId: string, context: SkillContext): WorkflowPlan | null {
  const skill = BUILTIN_SKILLS.find((s) => s.id === skillId)
  return skill ? skill.buildPlan(context) : null
}

export function isStudioProductionTemplate(skillId: string): boolean {
  return (STUDIO_PRODUCTION_TEMPLATE_IDS as readonly string[]).includes(skillId)
}
