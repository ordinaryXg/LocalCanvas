import { useCallback, useState, useEffect } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import type { StoryboardFrame, StoryboardLayout } from '../types/storyboard'
import { handleError } from '../utils/ErrorHandler'
import { importGeneratedMedia } from '../utils/generatedMedia'
import { resolveDefaultImageModelId, resolveDefaultVideoModelId } from '../utils/configResolve'
import type { BatchItemCompleteEvent } from '../types/ipc'

export function useStoryboardGroup(nodeId: string) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
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

  const updateFrames = useCallback(
    (next: StoryboardFrame[]) => updateNodeData(nodeId, { frames: next }),
    [nodeId, updateNodeData],
  )

  const regenerateSelectedImages = useCallback(async () => {
    const targets = frames.filter((f) => selectedFrameIds.includes(f.id) && f.prompt.trim())
    if (!targets.length || !currentProjectId) return

    const modelId = defaultImageModel
    if (!modelId) {
      handleError(new Error('请先配置图像模型'), 'storyboardRegen')
      return
    }

    setGenerating('image')
    setProgress(0)

    const unsub = window.api.on('model:batchItemComplete', (...args: unknown[]) => {
      const ev = args[0] as BatchItemCompleteEvent
      if (ev.scriptNodeId !== nodeId) return
      void (async () => {
        const frame = targets.find((f) => f.sequence === ev.sequence)
        if (!frame) return
        const { src, assetPath } = await importGeneratedMedia(currentProjectId, 'image', ev.result)
        updateFrames(
          frames.map((f) =>
            f.id === frame.id
              ? { ...f, imageSrc: src, imagePath: assetPath, status: 'image' as const }
              : f,
          ),
        )
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
      handleError(err, 'storyboardRegen')
    } finally {
      unsub()
      setGenerating(null)
      setProgress(100)
    }
  }, [frames, selectedFrameIds, currentProjectId, defaultImageModel, nodeId, updateFrames])

  return {
    frames,
    layout,
    selectedFrameIds,
    generating,
    progress,
    setLayout,
    toggleFrameSelection,
    updateFrames,
    regenerateSelectedImages,
  }
}
