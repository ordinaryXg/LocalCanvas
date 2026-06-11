import type { AgentSkill } from './types'

export const productDemoSkill: AgentSkill = {
  id: 'product-demo',
  name: '产品展示片',
  description: 'HERO ref-sheet + 功能点特写，适合 SaaS / 硬件演示',
  triggers: ['产品', 'demo', '功能', 'SaaS', '软件', '展示', 'product'],
  buildPlan({ intent }) {
    return {
      version: 1,
      intent,
      summary: 'Studio 产品展示片（请通过 ProductionPlan 落盘）',
      skillId: 'product-demo',
      executionMode: 'checkpoint',
      estimatedSteps: 4,
      checkpointAfter: ['script'],
      nodes: [],
      edges: [],
    }
  },
}
