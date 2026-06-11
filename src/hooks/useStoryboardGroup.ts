import { useCallback, useState, useEffect } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { useAgentStore } from '../stores/agentStore'
import type { StoryboardFrame, StoryboardLayout } from '../types/storyboard'
import { selectStoryboardTake } from '../utils/storyboardTakes'
import { wireComposeToStoryboardSelectedTakes } from '../utils/syncComposeFromStoryboard'
import { handleError, showToast } from '../utils/ErrorHandler'
import { importGeneratedMedia } from '../utils/generatedMedia'
import {
  getImageModelConfig,
  getVideoModelConfig,
  resolveDefaultImageModelId,
  resolveDefaultVideoModelId,
} from '../utils/configResolve'
import type { BatchItemCompleteEvent } from '../types/ipc'

function markFramesGenerating(
  frames: StoryboardFrame[],
  frameIds: Set<string>,
): StoryboardFrame[] {
  return frames.map((f) => (frameIds.has(f.id) ? { ...f, status: 'generating' as const } : f))
}

function markFramesFailed(
  frames: StoryboardFrame[],
  frameIds: Set<string>,
): StoryboardFrame[] {
  return frames.map((f) => (frameIds.has(f.id) ? { ...f, status: 'failed' as const } : f))
}

export type StoryboardRegenKind = 'image' | 'video'

/** 根据帧当前状态推断应重生成的媒体类型 */
export function inferStoryboardRegenKind(frame: StoryboardFrame): StoryboardRegenKind | null {
  if (!frame.prompt.trim()) return null
  if (frame.status === 'failed') {
    return frame.imagePath || frame.imageSrc ? 'video' : 'image'
  }
  if (frame.status === 'video') return 'video'
  if (frame.status === 'image' || frame.imagePath || frame.imageSrc) return 'video'
  return 'image'
}

async function resolveImageModelId(preferredId?: string): Promise<string | null> {
  const config = await window.api.config.read()
  const candidates = [preferredId?.trim(), resolveDefaultImageModelId(config)].filter(
    (id): id is string => !!id,
  )
  const uniqueCandidates = [...new Set(candidates)]

  if (uniqueCandidates.length === 0) {
    showToast('请先在 ⚙️ 模型配置 → 图像 中添加模型，并在「设置」标签选择默认图像模型后保存', 'error')
    return null
  }

  for (const modelId of uniqueCandidates) {
    const model = getImageModelConfig(config, modelId)
    if (model?.api_key?.trim()) return modelId
  }

  const modelId = uniqueCandidates[0]
  const model = getImageModelConfig(config, modelId)
  showToast(`请为「${model?.name ?? modelId}」填写 API Key 并保存配置`, 'error')
  return null
}

async function resolveVideoModelId(preferredId?: string): Promise<string | null> {
  const config = await window.api.config.read()
  const candidates = [preferredId?.trim(), resolveDefaultVideoModelId(config)].filter(
    (id): id is string => !!id,
  )
  const uniqueCandidates = [...new Set(candidates)]

  if (uniqueCandidates.length === 0) {
    showToast('请先在 ⚙️ 模型配置 → 视频 中添加模型，并在「设置」标签选择默认视频模型后保存', 'error')
    return null
  }

  for (const modelId of uniqueCandidates) {
    const model = getVideoModelConfig(config, modelId)
    if (model?.api_key?.trim()) return modelId
  }

  const modelId = uniqueCandidates[0]
  const model = getVideoModelConfig(config, modelId)
  showToast(`请为「${model?.name ?? modelId}」填写 API Key 并保存配置`, 'error')
  return null
}

export function useStoryboardGroup(nodeId: string) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const addConnection = useCanvasStore((s) => s.addConnection)
  const removeEdges = useCanvasStore((s) => s.removeEdges)
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === nodeId))
  const data = (node?.data ?? {}) as Record<string, unknown>
  const frames = (data.frames as StoryboardFrame[]) ?? []
  const layout = (data.layout as StoryboardLayout) ?? 'list'
  const selectedFrameIds = (data.selectedFrameIds as string[]) ?? []
  const currentProjectId = useProjectStore((s) => s.currentProjectId)

  const [generating, setGenerating] = useState<'image' | 'video' | null>(null)
  const [progress, setProgress] = useState(0)
  const [defaultImageModel, setDefaultImageModel] = useState('')
  const [defaultVideoModel, setDefaultVideoModel] = useState('')

  useEffect(() => {
    void window.api.config.read().then((config) => {
      setDefaultImageModel((data.imageModelId as string) || resolveDefaultImageModelId(config) || '')
      setDefaultVideoModel((data.videoModelId as string) || resolveDefaultVideoModelId(config) || '')
    })
  }, [data.imageModelId, data.videoModelId])

  const setLayout = useCallback(
    (next: StoryboardLayout) => updateNodeData(nodeId, { layout: next }),
    [nodeId, updateNodeData],
  )

  const toggleFrameSelection = useCallback(
    (frameId: string) => {
      const next = selectedFrameIds.includes(frameId)
        ? selectedFrameIds.filter((id) => id !== frameId)
        : [...selectedFrameIds, frameId]
      updateNodeData(nodeId, { selectedFrameIds: next })
    },
    [nodeId, selectedFrameIds, updateNodeData],
  )

  const selectSingleFrame = useCallback(
    (frameId: string) => {
      updateNodeData(nodeId, { selectedFrameIds: [frameId] })
    },
    [nodeId, updateNodeData],
  )

  const updateFrames = useCallback(
    (next: StoryboardFrame[]) => updateNodeData(nodeId, { frames: next }),
    [nodeId, updateNodeData],
  )

  const getLatestFrames = useCallback((): StoryboardFrame[] => {
    return (
      (useCanvasStore.getState().nodes.find((n) => n.id === nodeId)?.data
        .frames as StoryboardFrame[]) ?? frames
    )
  }, [frames, nodeId])

  const runBatchImages = useCallback(
    async (targets: StoryboardFrame[]) => {
      if (!targets.length || !currentProjectId) return

      const modelId = await resolveImageModelId(defaultImageModel)
      if (!modelId) return

      setGenerating('image')
      setProgress(0)
      const targetIds = new Set(targets.map((f) => f.id))
      let latestFrames = markFramesGenerating(getLatestFrames(), targetIds)
      updateFrames(latestFrames)

      const unsub = window.api.on('model:batchItemComplete', (...args: unknown[]) => {
        const ev = args[0] as BatchItemCompleteEvent
        if (ev.scriptNodeId !== nodeId) return
        void (async () => {
          const frame = targets.find((f) => f.sequence === ev.sequence)
          if (!frame) return
          const { src, assetPath } = await importGeneratedMedia(currentProjectId, 'image', ev.result)
          latestFrames = latestFrames.map((f) =>
            f.id === frame.id
              ? { ...f, imageSrc: src, imagePath: assetPath, status: 'image' as const }
              : f,
          )
          updateFrames(latestFrames)
        })()
      })

      try {
        await window.api.model.batchGenerateImages({
          scriptNodeId: nodeId,
          modelId,
          tasks: targets.map((f) => ({
            sequence: f.sequence,
            prompt: f.prompt,
            width: 1920,
            height: 1080,
          })),
        })
      } catch (err) {
        latestFrames = markFramesFailed(latestFrames, targetIds)
        updateFrames(latestFrames)
        handleError(err, 'storyboardRegen')
      } finally {
        unsub()
        setGenerating(null)
        setProgress(100)
      }
    },
    [currentProjectId, defaultImageModel, getLatestFrames, nodeId, updateFrames],
  )

  const runBatchVideos = useCallback(
    async (targets: StoryboardFrame[]) => {
      if (!targets.length || !currentProjectId) return

      const modelId = await resolveVideoModelId(defaultVideoModel)
      if (!modelId) return

      setGenerating('video')
      setProgress(0)

      const targetIds = new Set(targets.map((f) => f.id))
      let nextFrames = markFramesGenerating(getLatestFrames(), targetIds)
      updateFrames(nextFrames)
      try {
        for (let i = 0; i < targets.length; i++) {
          const frame = targets[i]!
          setProgress(Math.round((i / targets.length) * 100))
          nextFrames = nextFrames.map((f) =>
            f.id === frame.id ? { ...f, status: 'generating' as const } : f,
          )
          updateFrames(nextFrames)
          try {
            const { taskId } = await window.api.model.beginGenerateVideo({
              modelId,
              nodeId,
              prompt: frame.prompt,
              width: 1280,
              height: 720,
              duration: frame.duration || 5,
              firstFrame: frame.imagePath,
            })
            const resultPath = await new Promise<string>((resolve, reject) => {
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
            const { src, assetPath } = await importGeneratedMedia(currentProjectId, 'video', resultPath)
            nextFrames = nextFrames.map((f) =>
              f.id === frame.id
                ? { ...f, videoSrc: src, videoPath: assetPath, status: 'video' as const }
                : f,
            )
            updateFrames(nextFrames)
          } catch (err) {
            nextFrames = markFramesFailed(nextFrames, new Set([frame.id]))
            updateFrames(nextFrames)
            handleError(err, 'storyboardRegenVideo')
          }
        }
      } finally {
        setGenerating(null)
        setProgress(100)
      }
    },
    [currentProjectId, defaultVideoModel, getLatestFrames, nodeId, updateFrames],
  )

  const regenerateFrameImage = useCallback(
    async (frameId: string) => {
      const frame = frames.find((f) => f.id === frameId)
      if (!frame?.prompt.trim()) return
      await runBatchImages([frame])
    },
    [frames, runBatchImages],
  )

  const regenerateFrameVideo = useCallback(
    async (frameId: string) => {
      const frame = frames.find((f) => f.id === frameId)
      if (!frame?.prompt.trim() || !(frame.imagePath || frame.imageSrc)) return
      await runBatchVideos([frame])
    },
    [frames, runBatchVideos],
  )

  const regenerateSelectedImages = useCallback(async () => {
    const targets = frames.filter((f) => selectedFrameIds.includes(f.id) && f.prompt.trim())
    await runBatchImages(targets)
  }, [frames, runBatchImages, selectedFrameIds])

  const regenerateSelectedVideos = useCallback(async () => {
    const targets = frames.filter(
      (f) =>
        selectedFrameIds.includes(f.id) &&
        f.prompt.trim() &&
        (f.imagePath || f.imageSrc),
    )
    await runBatchVideos(targets)
  }, [frames, runBatchVideos, selectedFrameIds])

  const regenerateSelected = useCallback(async () => {
    const selected = frames.filter((f) => selectedFrameIds.includes(f.id))
    if (!selected.length) return

    const imageTargets = selected.filter((f) => inferStoryboardRegenKind(f) === 'image')
    const videoTargets = selected.filter((f) => inferStoryboardRegenKind(f) === 'video')

    if (imageTargets.length === 0 && videoTargets.length === 0) {
      showToast('所选帧缺少可用的提示词', 'info')
      return
    }

    if (imageTargets.length > 0) await runBatchImages(imageTargets)
    if (videoTargets.length > 0) await runBatchVideos(videoTargets)
  }, [frames, runBatchImages, runBatchVideos, selectedFrameIds])

  const retryAllFailedFrames = useCallback(async () => {
    const failed = frames.filter((f) => f.status === 'failed')
    if (!failed.length) return
    for (const frame of failed) {
      if (frame.imagePath || frame.imageSrc) {
        await regenerateFrameVideo(frame.id)
      } else if (frame.prompt.trim()) {
        await regenerateFrameImage(frame.id)
      }
    }
  }, [frames, regenerateFrameImage, regenerateFrameVideo])

  const syncComposeForSelectedTakes = useCallback(
    (nextFrames: StoryboardFrame[]) => {
      const composeNodeId = useAgentStore.getState().handoff?.composeNodeId
      if (!composeNodeId) return
      const result = wireComposeToStoryboardSelectedTakes(
        nextFrames,
        composeNodeId,
        nodes,
        edges,
      )
      if (result.edgeIdsToRemove.length > 0) removeEdges(result.edgeIdsToRemove)
      for (const edge of result.edgesToAdd) addConnection(edge)
      updateNodeData(composeNodeId, { clips: result.composeClips })
    },
    [addConnection, edges, nodes, removeEdges, updateNodeData],
  )

  const selectFrameTake = useCallback(
    (frameId: string, takeId: string) => {
      const next = frames.map((f) => (f.id === frameId ? selectStoryboardTake(f, takeId) : f))
      updateNodeData(nodeId, { frames: next })
      syncComposeForSelectedTakes(next)
    },
    [frames, nodeId, syncComposeForSelectedTakes, updateNodeData],
  )

  return {
    frames,
    layout,
    selectedFrameIds,
    generating,
    progress,
    setLayout,
    toggleFrameSelection,
    selectSingleFrame,
    updateFrames,
    regenerateSelected,
    regenerateSelectedImages,
    regenerateSelectedVideos,
    regenerateFrameImage,
    regenerateFrameVideo,
    retryAllFailedFrames,
    selectFrameTake,
  }
}
