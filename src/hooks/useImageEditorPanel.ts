import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { ImageModelConfig } from '../types/config'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { handleError, showToast } from '../utils/ErrorHandler'
import {
  assertNoWarnEdgesForNode,
  GenerationBlockedError,
  GENERATION_CONSUMED_HANDLES,
} from '../capabilities/generation-guard'
import { collectInboundEdgeWarnings } from '../capabilities/edge-compat'
import { getImageGeneratorUi } from '../capabilities/generator-ui'
import { resolveImageRefFromNodeId } from '../utils/resolveImageRefForApi'
import { importGeneratedMedia } from '../utils/generatedMedia'
import { useModelGeneration } from './useModelGeneration'
import { STYLE_PRESETS, applyStyleToPrompt, getStylePreset } from '../constants/stylePresets'
import {
  DEFAULT_EDITOR_PREVIEW_HEIGHT,
  DEFAULT_EDITOR_PREVIEW_WIDTH,
  PREVIEW_HEIGHT_MAX,
  PREVIEW_HEIGHT_MIN,
  PREVIEW_WIDTH_MAX,
  PREVIEW_WIDTH_MIN,
} from '../utils/imageEditorLayout'
import { nodeDisplayTitle } from '../utils/nodeNaming'
import { useEditorShellStore } from '../stores/editorShellStore'
import { assetPathToBlobUrl } from '../utils/assetStorage'
import { findScrollParent, scrollElementWithinContainer } from '../utils/scrollWithin'
import { IMAGE_RATIO_MAP } from '../components/panels/imageEditorHelpers'
import type { StylePresetChipsHandle } from '../components/panels/StylePresetChips'
import { listImageReferenceEdges } from '../utils/videoReferenceSlots'

export function useImageEditorPanel(nodeId: string) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const removeEdge = useCanvasStore((s) => s.removeEdge)
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const focusStyleChips = useEditorShellStore((s) => s.focusStyleChips)
  const clearFocusStyleChips = useEditorShellStore((s) => s.clearFocusStyleChips)
  const scrollToGeneratorWarnings = useEditorShellStore((s) => s.scrollToGeneratorWarnings)
  const clearScrollToGeneratorWarnings = useEditorShellStore((s) => s.clearScrollToGeneratorWarnings)

  const node = nodes.find((n) => n.id === nodeId)
  const data = (node?.data ?? {}) as Record<string, unknown>
  const rowRef = useRef<HTMLDivElement>(null)
  const styleChipsRef = useRef<StylePresetChipsHandle>(null)
  const warningsRef = useRef<HTMLDivElement>(null)
  const [containerMaxWidth, setContainerMaxWidth] = useState(PREVIEW_WIDTH_MAX)

  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    const measure = () => {
      setContainerMaxWidth(
        Math.min(PREVIEW_WIDTH_MAX, Math.max(PREVIEW_WIDTH_MIN + 80, el.clientWidth - 180)),
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const [prompt, setPrompt] = useState((data.prompt as string) || '')
  const [negativePrompt, setNegativePrompt] = useState((data.negativePrompt as string) || '')
  const editorUi = (data.editorUi as {
    negativeOpen?: boolean
    previewHeight?: number
    previewWidth?: number
  } | undefined) ?? {}

  const previewHeight = editorUi.previewHeight ?? DEFAULT_EDITOR_PREVIEW_HEIGHT
  const previewWidth = editorUi.previewWidth ?? DEFAULT_EDITOR_PREVIEW_WIDTH
  const [livePreviewWidth, setLivePreviewWidth] = useState<number | null>(null)
  const displayPreviewWidth = livePreviewWidth ?? previewWidth

  const commitPreviewHeight = useCallback(
    (nextHeight: number) => {
      const clamped = Math.min(PREVIEW_HEIGHT_MAX, Math.max(PREVIEW_HEIGHT_MIN, nextHeight))
      updateNodeData(nodeId, {
        editorUi: { ...editorUi, previewHeight: clamped },
      })
    },
    [editorUi, nodeId, updateNodeData],
  )

  const commitPreviewWidth = useCallback(
    (nextWidth: number) => {
      const clamped = Math.min(containerMaxWidth, Math.max(PREVIEW_WIDTH_MIN, nextWidth))
      updateNodeData(nodeId, {
        editorUi: { ...editorUi, previewWidth: clamped },
      })
    },
    [containerMaxWidth, editorUi, nodeId, updateNodeData],
  )

  const [negativeOpen, setNegativeOpen] = useState(() => !!editorUi.negativeOpen)
  const [modelId, setModelId] = useState((data.modelId as string) || '')
  const [ratio, setRatio] = useState((data.ratio as string) || '16:9')
  const [batchSize, setBatchSize] = useState(() =>
    typeof data.batchSize === 'number' ? data.batchSize : 1,
  )
  const [styleId, setStyleId] = useState((data.styleId as string) || '')
  const [imageModels, setImageModels] = useState<ImageModelConfig[]>([])

  const { isGenerating, progress, run, cancel } = useModelGeneration(nodeId, (pct) => {
    updateNodeData(nodeId, { progress: pct })
  })

  useEffect(() => {
    setPrompt((data.prompt as string) || '')
  }, [data.prompt])

  useEffect(() => {
    setNegativePrompt((data.negativePrompt as string) || '')
  }, [data.negativePrompt])

  useEffect(() => {
    setStyleId((data.styleId as string) || '')
  }, [data.styleId])

  useEffect(() => {
    setRatio((data.ratio as string) || '16:9')
  }, [nodeId, data.ratio])

  useEffect(() => {
    setBatchSize(typeof data.batchSize === 'number' ? data.batchSize : 1)
  }, [nodeId, data.batchSize])

  useEffect(() => {
    void window.api.config.read().then((config) => {
      setImageModels(config.image_models)
      if (!modelId && config.settings.default_image_model) {
        setModelId(config.settings.default_image_model)
      }
    })
  }, [modelId])

  useEffect(() => {
    if (focusStyleChips) {
      styleChipsRef.current?.focus()
      clearFocusStyleChips()
    }
  }, [focusStyleChips, clearFocusStyleChips])

  useEffect(() => {
    if (!scrollToGeneratorWarnings || !warningsRef.current) return
    const scrollParent = findScrollParent(warningsRef.current)
    if (scrollParent) {
      scrollElementWithinContainer(scrollParent, warningsRef.current)
    }
    clearScrollToGeneratorWarnings()
  }, [scrollToGeneratorWarnings, clearScrollToGeneratorWarnings])

  const selectedModel = imageModels.find((m) => m.id === modelId)
  const ui = getImageGeneratorUi(modelId, selectedModel?.model)
  const referenceEdges = useMemo(
    () => listImageReferenceEdges(edges, nodeId),
    [edges, nodeId],
  )
  const promptEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'prompt')
  const promptSourceNode = promptEdge ? nodes.find((n) => n.id === promptEdge.source) : undefined
  const isPromptSynced =
    !!promptEdge &&
    (promptSourceNode?.type === 'text' || promptSourceNode?.type === 'script')

  const warnings = useMemo(
    () =>
      collectInboundEdgeWarnings(nodeId, nodes, edges, GENERATION_CONSUMED_HANDLES.image),
    [nodeId, nodes, edges],
  )

  const preset = getStylePreset(styleId)
  const recommendedModelId = preset?.recommendedImageModel

  const handleGenerate = useCallback(async () => {
    if (!modelId || !prompt || !currentProjectId) return
    updateNodeData(nodeId, { isGenerating: true, progress: 0, error: undefined })

    const [width, height] = IMAGE_RATIO_MAP[ratio] || [1024, 1024]
    const stylePreset = STYLE_PRESETS.find((p) => p.id === styleId)
    const finalPrompt = stylePreset ? applyStyleToPrompt(prompt, stylePreset) : prompt
    const finalNegative = [negativePrompt, stylePreset?.negativePrompt].filter(Boolean).join(', ')

    try {
      assertNoWarnEdgesForNode(nodeId, nodes, edges, 'image')
      const referenceImages = (
        await Promise.all(
          referenceEdges.map((edge) =>
            resolveImageRefFromNodeId(edge.source, nodes, currentProjectId),
          ),
        )
      ).filter((url): url is string => !!url)
      const { result: resultPath } = await run(() =>
        window.api.model.beginGenerateImage({
          modelId,
          nodeId,
          prompt: finalPrompt,
          negativePrompt: finalNegative || undefined,
          width,
          height,
          batchSize,
          ...(referenceImages.length > 0
            ? referenceImages.length === 1
              ? { referenceImage: referenceImages[0] }
              : { referenceImages }
            : {}),
        }),
      )

      const { src, assetPath, fileName } = await importGeneratedMedia(
        currentProjectId,
        'image',
        resultPath,
      )

      const prevRecent = (data.recentOutputs as string[] | undefined) ?? []
      const recentOutputs = assetPath
        ? [...prevRecent.filter((p) => p !== assetPath), assetPath].slice(-3)
        : prevRecent

      updateNodeData(nodeId, {
        imageSrc: src,
        ...(assetPath ? { imageAssetPath: assetPath } : {}),
        fileName,
        prompt,
        negativePrompt,
        modelId,
        ratio,
        batchSize,
        styleId: styleId || undefined,
        recentOutputs,
        isGenerating: false,
        progress: 100,
      })
    } catch (err) {
      if (err instanceof GenerationBlockedError) {
        showToast(err.message, 'error')
        updateNodeData(nodeId, { isGenerating: false })
        return
      }
      handleError(err, 'imageGenerate')
      updateNodeData(nodeId, { isGenerating: false, error: String(err) })
    }
  }, [
    modelId,
    prompt,
    currentProjectId,
    ratio,
    styleId,
    negativePrompt,
    batchSize,
    nodeId,
    nodes,
    edges,
    referenceEdges,
    run,
    updateNodeData,
    data.recentOutputs,
  ])

  const generateDisabled = isGenerating || !modelId || !prompt || warnings.length > 0

  const handleSelectRecent = useCallback(
    async (assetPath: string) => {
      if (!currentProjectId) return
      try {
        const src = await assetPathToBlobUrl(currentProjectId, assetPath)
        updateNodeData(nodeId, {
          imageSrc: src,
          imageAssetPath: assetPath,
          fileName: assetPath.split('/').pop(),
        })
      } catch {
        showToast('无法加载历史图片', 'error')
      }
    },
    [currentProjectId, nodeId, updateNodeData],
  )

  const handleStyleChange = (next: string) => {
    setStyleId(next)
    updateNodeData(nodeId, { styleId: next || undefined })
  }

  const handleNegativeToggle = () => {
    const next = !negativeOpen
    setNegativeOpen(next)
    updateNodeData(nodeId, {
      editorUi: { ...editorUi, negativeOpen: next },
    })
  }

  const displayTitle = node ? nodeDisplayTitle(node, '图片') : '图片'
  const recentOutputs = (data.recentOutputs as string[] | undefined) ?? []

  return {
    rowRef,
    styleChipsRef,
    warningsRef,
    data,
    node,
    currentProjectId,
    previewHeight,
    displayPreviewWidth,
    livePreviewWidth,
    setLivePreviewWidth,
    commitPreviewHeight,
    commitPreviewWidth,
    containerMaxWidth,
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    negativeOpen,
    modelId,
    setModelId,
    ratio,
    setRatio,
    batchSize,
    setBatchSize,
    styleId,
    imageModels,
    isGenerating,
    progress,
    cancel,
    ui,
    referenceEdges,
    promptEdge,
    promptSourceNode,
    isPromptSynced,
    warnings,
    recommendedModelId,
    handleGenerate,
    generateDisabled,
    handleSelectRecent,
    handleStyleChange,
    handleNegativeToggle,
    displayTitle,
    recentOutputs,
    removeEdge,
    updateNodeData,
    nodeId,
  }
}
