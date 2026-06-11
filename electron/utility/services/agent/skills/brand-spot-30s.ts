import type { AgentSkill } from './types'

/** Studio 片型模板：实际落盘由 buildProductionPlan 生成 skeleton */
export const brandSpot30sSkill: AgentSkill = {
  id: 'brand-spot-30s',
  name: '品牌广告 30s',
  description: 'Hook → Hero → Story → CTA，Brief + 镜头表 + skeleton 落盘',
  triggers: [
    '品牌',
    '广告',
    'promo',
    'commercial',
    '30秒',
    '30 秒',
    '宣传片',
    '品牌片',
  ],
  buildPlan({ intent }) {
    return {
      version: 1,
      intent,
      summary: 'Studio 品牌广告片（请通过 ProductionPlan 落盘）',
      skillId: 'brand-spot-30s',
      executionMode: 'checkpoint',
      estimatedSteps: 4,
      checkpointAfter: ['script'],
      nodes: [],
      edges: [],
    }
  },
}

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
