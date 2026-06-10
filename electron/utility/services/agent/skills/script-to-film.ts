import type { AgentSkill } from './types'

export const scriptToFilmSkill: AgentSkill = {
  id: 'script-to-film',
  name: '脚本成片',
  description: '故事梗概 → 分镜脚本 → 批量出图出视频 → 合成',
  triggers: ['脚本', '分镜', '故事', '短片', '电影', 'script', 'storyboard', 'film'],
  buildPlan({ intent }) {
    return {
      version: 1,
      intent,
      summary: '创建脚本节点生成分镜，再批量生成图片、视频并合成导出',
      skillId: 'script-to-film',
      executionMode: 'checkpoint',
      estimatedSteps: 4,
      checkpointAfter: ['script'],
      nodes: [
        {
          tempId: 'script-1',
          type: 'script',
          label: '分镜脚本',
          data: { storyInput: intent },
        },
        {
          tempId: 'compose-1',
          type: 'compose',
          label: '合成导出',
          data: {},
          position: { x: 800, y: 120 },
        },
      ],
      edges: [],
    }
  },
}
