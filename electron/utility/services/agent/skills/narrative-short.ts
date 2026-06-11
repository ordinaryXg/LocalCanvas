import type { AgentSkill } from './types'

export const narrativeShortSkill: AgentSkill = {
  id: 'narrative-short',
  name: '叙事短片',
  description: '多场景叙事，按 Scene 分组 checkpoint',
  triggers: ['故事', '叙事', 'narrative', '短片', '电影', '分钟', '角色'],
  buildPlan({ intent }) {
    return {
      version: 1,
      intent,
      summary: 'Studio 叙事短片（请通过 ProductionPlan 落盘）',
      skillId: 'narrative-short',
      executionMode: 'checkpoint',
      estimatedSteps: 5,
      checkpointAfter: ['script'],
      nodes: [],
      edges: [],
    }
  },
}
