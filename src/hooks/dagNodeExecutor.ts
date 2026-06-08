import type { Node, Edge } from '@xyflow/react'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { collectLlmVisionImagesFromEdges } from '../utils/collectLlmVisionImages'
import { importGeneratedMedia } from '../utils/generatedMedia'

const RATIO_MAP: Record<string, [number, number]> = {
  '1:1': [1920, 1920],
  '16:9': [2560, 1440],
  '9:16': [1440, 2560],
  '3:4': [1920, 2560],
  '4:3': [2560, 1920],
}

function waitForGeneration(taskId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      unsubComplete()
      unsubError()
    }
    const unsubComplete = window.api.on('model:complete', (...args: unknown[]) => {
      const e = args[0] as { taskId: string; result: string }
      if (e.taskId === taskId) {
        cleanup()
        resolve(e.result)
      }
    })
    const unsubError = window.api.on('model:error', (...args: unknown[]) => {
      const e = args[0] as { taskId?: string; error: string }
      if (e.taskId === taskId) {
        cleanup()
        reject(new Error(e.error || '生成失败'))
      }
    })
  })
}

export async function executeDagNode(
  node: Node,
  subgraphNodes: Node[],
  subgraphEdges: Edge[],
): Promise<void> {
  const projectId = useProjectStore.getState().currentProjectId
  if (!projectId) throw new Error('未打开项目')

  const updateNodeData = useCanvasStore.getState().updateNodeData
  const data = node.data as Record<string, unknown>

  if (node.type === 'image') {
    const modelId = (data.modelId as string) || ''
    const prompt = (data.prompt as string) || ''
    if (!modelId || !prompt) throw new Error('图片节点缺少模型或提示词')
    const ratio = (data.ratio as string) || '16:9'
    const [width, height] = RATIO_MAP[ratio] || [1024, 1024]
    const { taskId } = await window.api.model.beginGenerateImage({
      modelId,
      nodeId: node.id,
      prompt,
      negativePrompt: data.negativePrompt as string | undefined,
      width,
      height,
    })
    const resultPath = await waitForGeneration(taskId)
    const { src, assetPath, fileName } = await importGeneratedMedia(projectId, 'image', resultPath)
    updateNodeData(node.id, {
      imageSrc: src,
      ...(assetPath ? { imageAssetPath: assetPath } : {}),
      fileName,
      isGenerating: false,
      progress: 100,
    })
    return
  }

  if (node.type === 'video') {
    const modelId = (data.modelId as string) || ''
    const prompt = (data.prompt as string) || ''
    if (!modelId || !prompt) throw new Error('视频节点缺少模型或提示词')
    const ratio = (data.ratio as string) || '16:9'
    const [width, height] = RATIO_MAP[ratio] || [1280, 720]
    const { taskId } = await window.api.model.beginGenerateVideo({
      modelId,
      nodeId: node.id,
      prompt,
      width,
      height,
      duration: (data.duration as number) || 5,
      firstFrame: data.firstFrame as string | undefined,
      lastFrame: data.lastFrame as string | undefined,
    })
    const resultPath = await waitForGeneration(taskId)
    const { src, assetPath, fileName } = await importGeneratedMedia(projectId, 'video', resultPath)
    updateNodeData(node.id, {
      videoSrc: src,
      ...(assetPath ? { videoAssetPath: assetPath } : {}),
      fileName,
      isGenerating: false,
      progress: 100,
    })
    return
  }

  if (node.type === 'text') {
    const modelId = (data.modelId as string) || ''
    const draft =
      (data.draft as string) ||
      (data.inputContent as string) ||
      (data.prompt as string) ||
      ''
    if (!modelId || !draft) throw new Error('文本节点缺少模型或草稿')
    const images = await collectLlmVisionImagesFromEdges(
      node.id,
      subgraphNodes,
      subgraphEdges,
      projectId,
    )
    const { taskId } = await window.api.model.beginGenerateText({
      modelId,
      nodeId: node.id,
      prompt: draft,
      systemPrompt: (data.systemPrompt as string) || undefined,
      ...(images.length > 0 ? { images } : {}),
    })
    const result = await waitForGeneration(taskId)
    updateNodeData(node.id, {
      output: result,
      outputMode: 'generated',
      outputEdited: false,
      isGenerating: false,
    })
  }
}
