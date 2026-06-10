import type { AgentSkill, SkillContext } from './types'
import { textToVideoSkill } from './text-to-video'
import { scriptToFilmSkill } from './script-to-film'
import { firstLastFrameSkill } from './first-last-frame'
import type { WorkflowPlan } from '../../../../../src/types/agent'

export const BUILTIN_SKILLS: AgentSkill[] = [textToVideoSkill, scriptToFilmSkill, firstLastFrameSkill]

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

export function rankSkillsForIntent(intent: string, disabledSkills: string[] = []): RankedSkill[] {
  const lower = intent.toLowerCase()
  const scored: RankedSkill[] = []
  for (const skill of BUILTIN_SKILLS) {
    if (disabledSkills.includes(skill.id)) continue
    if (!skill.triggers?.length) continue
    let score = 0
    for (const trigger of skill.triggers) {
      if (lower.includes(trigger.toLowerCase())) score += 1
    }
    if (score > 0) scored.push({ skill, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored
}

export function buildSkillPlan(skillId: string, context: SkillContext): WorkflowPlan | null {
  const skill = BUILTIN_SKILLS.find((s) => s.id === skillId)
  return skill ? skill.buildPlan(context) : null
}
