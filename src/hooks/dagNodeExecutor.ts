import type { Node, Edge } from '@xyflow/react'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { collectLlmVisionImagesFromEdges } from '../utils/collectLlmVisionImages'
import { importGeneratedMedia } from '../utils/generatedMedia'
import { normalizeTextNodeData } from '../utils/textNodeOutput'
import { coerceSinglePromptOutput, resolveTextNodeSystemPrompt, buildTextNodeGeneratePrompt } from '../utils/textPromptConstraints'
import { runTrackedModelTask } from '../utils/dagNodeGeneration'
import { nodeHasActiveGeneration } from '../utils/canvasGenerationState'

const RATIO_MAP: Record<string, [number, number]> = {
  '1:1': [1920, 1920],
  '16:9': [2560, 1440],
  '9:16': [1440, 2560],
  '3:4': [1920, 2560],
  '4:3': [2560, 1920],
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

  if (nodeHasActiveGeneration(node)) {
    throw new Error('节点正在生成中，请等待完成')
  }

  if (node.type === 'image') {
    const modelId = (data.modelId as string) || ''
    const prompt = (data.prompt as string) || ''
    if (!modelId || !prompt) throw new Error('图片节点缺少模型或提示词')
    const ratio = (data.ratio as string) || '16:9'
    const [width, height] = RATIO_MAP[ratio] || [1024, 1024]
    const resultPath = await runTrackedModelTask(node.id, updateNodeData, () =>
      window.api.model.beginGenerateImage({
        modelId,
        nodeId: node.id,
        prompt,
        negativePrompt: data.negativePrompt as string | undefined,
        width,
        height,
      }),
    )
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
    const resultPath = await runTrackedModelTask(node.id, updateNodeData, () =>
      window.api.model.beginGenerateVideo({
        modelId,
        nodeId: node.id,
        prompt,
        width,
        height,
        duration: (data.duration as number) || 5,
        firstFrame: data.firstFrame as string | undefined,
        lastFrame: data.lastFrame as string | undefined,
      }),
    )
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
    const normalized = normalizeTextNodeData(data)
    const { modelId, draft, systemPrompt, outputMode, outputEdited } = normalized
    if (!modelId || !draft.trim()) throw new Error('文本节点缺少模型或草稿')

    if (outputMode === 'passthrough' && !outputEdited && draft.trim()) {
      updateNodeData(node.id, {
        output: draft.trim(),
        outputMode: 'passthrough',
        outputEdited: false,
        isGenerating: false,
        progress: undefined,
      })
      return
    }

    const images = await collectLlmVisionImagesFromEdges(
      node.id,
      subgraphNodes,
      subgraphEdges,
      projectId,
    )
    const resolvedSystemPrompt = resolveTextNodeSystemPrompt(
      node.id,
      useCanvasStore.getState().edges.map((e) => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
      })),
      systemPrompt,
      new Map(useCanvasStore.getState().nodes.map((n) => [n.id, n.type ?? ''])),
    )
    const result = await runTrackedModelTask(node.id, updateNodeData, () =>
      window.api.model.beginGenerateText({
        modelId,
        nodeId: node.id,
        prompt: buildTextNodeGeneratePrompt(draft),
        systemPrompt: resolvedSystemPrompt,
        ...(images.length > 0 ? { images } : {}),
      }),
    )
    updateNodeData(node.id, {
      output: coerceSinglePromptOutput(result),
      outputMode: 'generated',
      outputEdited: false,
      isGenerating: false,
      progress: 100,
    })
  }
}
