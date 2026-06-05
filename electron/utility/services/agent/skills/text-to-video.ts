import type { AgentSkill } from './types'

export const textToVideoSkill: AgentSkill = {
  id: 'text-to-video',
  name: '文生图生视频',
  description: '文本描述 → 图片 → 视频片段',
  triggers: ['文生视频', '文生图', '宣传片', '广告', '短视频', 'text to video', 'promo'],
  buildPlan({ intent, defaultLlm, defaultImageModel, defaultVideoModel }) {
    return {
      version: 1,
      intent,
      summary: '创建文本节点生成画面描述，再依次生成图片与视频',
      skillId: 'text-to-video',
      executionMode: 'auto',
      estimatedSteps: 3,
      nodes: [
        {
          tempId: 'text-1',
          type: 'text',
          label: '画面描述',
          data: { draft: intent, output: intent, outputMode: 'passthrough', modelId: defaultLlm ?? '' },
          modelHint: defaultLlm,
        },
        {
          tempId: 'image-1',
          type: 'image',
          label: '分镜图',
          data: { ratio: '16:9', modelId: defaultImageModel ?? '' },
          modelHint: defaultImageModel,
        },
        {
          tempId: 'video-1',
          type: 'video',
          label: '视频片段',
          data: { ratio: '16:9', duration: 5, modelId: defaultVideoModel ?? '' },
          modelHint: defaultVideoModel,
        },
      ],
      edges: [
        { source: 'text-1', sourceHandle: 'prompt', target: 'image-1', targetHandle: 'prompt' },
        { source: 'image-1', sourceHandle: 'image', target: 'video-1', targetHandle: 'firstFrame' },
        { source: 'text-1', sourceHandle: 'prompt', target: 'video-1', targetHandle: 'prompt' },
      ],
    }
  },
}
