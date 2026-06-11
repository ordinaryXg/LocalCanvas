import type { AgentSkill } from './types'

export const montageBrollSkill: AgentSkill = {
  id: 'montage-broll',
  name: '纪录片蒙太奇',
  description: '旁白驱动 + B-roll 空镜，快速铺量 t2v',
  triggers: ['旁白', '纪录片', 'montage', 'broll', '空镜', '蒙太奇', '解说'],
  buildPlan({ intent }) {
    return {
      version: 1,
      intent,
      summary: 'Studio 纪录片蒙太奇（请通过 ProductionPlan 落盘）',
      skillId: 'montage-broll',
      executionMode: 'checkpoint',
      estimatedSteps: 4,
      checkpointAfter: ['script'],
      nodes: [],
      edges: [],
    }
  },
}
