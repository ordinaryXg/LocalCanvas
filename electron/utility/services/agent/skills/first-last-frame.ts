import type { AgentSkill } from './types'

export const firstLastFrameSkill: AgentSkill = {
  id: 'first-last-frame',
  name: '首尾帧过渡',
  description: '起始帧 + 结束帧 → 过渡视频',
  triggers: ['首尾帧', '过渡', 'first frame', 'last frame', '插帧'],
  buildPlan({ intent, defaultImageModel, defaultVideoModel }) {
    return {
      version: 1,
      intent,
      summary: '分别生成起始与结束画面，再创建首尾帧过渡视频',
      skillId: 'first-last-frame',
      executionMode: 'auto',
      estimatedSteps: 5,
      nodes: [
        {
          tempId: 'text-start',
          type: 'text',
          label: '起始画面',
          data: { inputContent: `${intent}（起始画面）` },
        },
        {
          tempId: 'text-end',
          type: 'text',
          label: '结束画面',
          data: { inputContent: `${intent}（结束画面）` },
          position: { x: 0, y: 240 },
        },
        {
          tempId: 'image-start',
          type: 'image',
          label: '起始帧',
          data: { ratio: '16:9', modelId: defaultImageModel ?? '' },
          position: { x: 400, y: 0 },
        },
        {
          tempId: 'image-end',
          type: 'image',
          label: '结束帧',
          data: { ratio: '16:9', modelId: defaultImageModel ?? '' },
          position: { x: 400, y: 240 },
        },
        {
          tempId: 'video-1',
          type: 'video',
          label: '过渡视频',
          data: { ratio: '16:9', duration: 5, modelId: defaultVideoModel ?? '' },
          position: { x: 800, y: 120 },
        },
      ],
      edges: [
        { source: 'text-start', sourceHandle: 'prompt', target: 'image-start', targetHandle: 'prompt' },
        { source: 'text-end', sourceHandle: 'prompt', target: 'image-end', targetHandle: 'prompt' },
        { source: 'image-start', sourceHandle: 'firstFrame', target: 'video-1', targetHandle: 'firstFrame' },
        { source: 'image-end', sourceHandle: 'lastFrame', target: 'video-1', targetHandle: 'lastFrame' },
      ],
    }
  },
}
