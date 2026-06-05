import { getWorkflowRepository } from './workflow-repository'

export function installPresetWorkflows(): void {
  const repo = getWorkflowRepository()
  const existing = repo.findAll({ isPreset: true })
  if (existing.length > 0) return

  repo.create({
    name: '文生图 → 图生视频',
    description: '从文本描述生成图片，再将图片转为视频片段',
    nodes: [
      { id: 'text-1', type: 'text', position: { x: 0, y: 100 }, data: { content: '画面描述...' } },
      { id: 'image-1', type: 'image', position: { x: 350, y: 50 }, data: {} },
      { id: 'video-1', type: 'video', position: { x: 700, y: 100 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'text-1', sourceHandle: 'prompt', target: 'image-1', targetHandle: 'prompt' },
      { id: 'e2', source: 'image-1', sourceHandle: 'image', target: 'video-1', targetHandle: 'firstFrame' },
    ],
    isPreset: true,
  })

  repo.create({
    name: '脚本 → 分镜 → 批量视频',
    description: '输入故事梗概，自动生成分镜脚本，批量生成图片和视频',
    nodes: [{ id: 'script-1', type: 'script', position: { x: 0, y: 100 }, data: {} }],
    edges: [],
    isPreset: true,
  })

  repo.create({
    name: '首尾帧视频生成',
    description: '分别生成起始帧和结束帧图片，自动生成过渡视频',
    nodes: [
      { id: 'text-start', type: 'text', position: { x: 0, y: 0 }, data: { content: '起始画面描述' } },
      { id: 'text-end', type: 'text', position: { x: 0, y: 200 }, data: { content: '结束画面描述' } },
      { id: 'image-start', type: 'image', position: { x: 350, y: 0 }, data: {} },
      { id: 'image-end', type: 'image', position: { x: 350, y: 200 }, data: {} },
      { id: 'video-1', type: 'video', position: { x: 700, y: 100 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'text-start', sourceHandle: 'prompt', target: 'image-start', targetHandle: 'prompt' },
      { id: 'e2', source: 'text-end', sourceHandle: 'prompt', target: 'image-end', targetHandle: 'prompt' },
      { id: 'e3', source: 'image-start', sourceHandle: 'image', target: 'video-1', targetHandle: 'firstFrame' },
      { id: 'e4', source: 'image-end', sourceHandle: 'image', target: 'video-1', targetHandle: 'lastFrame' },
    ],
    isPreset: true,
  })

  repo.create({
    name: '多片段合成导出',
    description: '将多个视频片段拼接，可选混入背景音乐',
    nodes: [
      { id: 'video-1', type: 'video', position: { x: 0, y: 0 }, data: {} },
      { id: 'video-2', type: 'video', position: { x: 0, y: 150 }, data: {} },
      { id: 'video-3', type: 'video', position: { x: 0, y: 300 }, data: {} },
      { id: 'audio-1', type: 'audio', position: { x: 350, y: 350 }, data: {} },
      { id: 'compose-1', type: 'compose', position: { x: 700, y: 150 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'video-1', sourceHandle: 'video', target: 'compose-1', targetHandle: 'video1' },
      { id: 'e2', source: 'video-2', sourceHandle: 'video', target: 'compose-1', targetHandle: 'video2' },
      { id: 'e3', source: 'video-3', sourceHandle: 'video', target: 'compose-1', targetHandle: 'video3' },
      { id: 'e4', source: 'audio-1', sourceHandle: 'audio', target: 'compose-1', targetHandle: 'audio' },
    ],
    isPreset: true,
  })
}
