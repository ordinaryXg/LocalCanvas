import type { WorkflowPlan } from '../../../../../src/types/agent'

export interface SkillContext {
  intent: string
  defaultLlm?: string
  defaultImageModel?: string
  defaultVideoModel?: string
}

export interface AgentSkill {
  id: string
  name: string
  description: string
  triggers?: string[]
  buildPlan(context: SkillContext): WorkflowPlan
}
