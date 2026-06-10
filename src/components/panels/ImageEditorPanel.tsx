import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { ImageModelConfig } from '../../types/config'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { handleError, showToast } from '../../utils/ErrorHandler'
import {
  assertNoWarnEdgesForNode,
  GenerationBlockedError,
  GENERATION_CONSUMED_HANDLES,
} from '../../capabilities/generation-guard'
import { collectInboundEdgeWarnings } from '../../capabilities/edge-compat'
import { getImageGeneratorUi } from '../../capabilities/generator-ui'
import { ModelCapabilityBadges } from './ModelCapabilityBadges'
import { NodeImageThumb } from '../common/NodeImageThumb'
import { resolveImageRefFromNodeId } from '../../utils/resolveImageRefForApi'
import { importGeneratedMedia } from '../../utils/generatedMedia'
import { useModelGeneration } from '../../hooks/useModelGeneration'
import { ResizableTextarea } from '../common/ResizableTextarea'
import { STYLE_PRESETS, applyStyleToPrompt, getStylePreset } from '../../constants/stylePresets'
import {
  DEFAULT_EDITOR_PREVIEW_HEIGHT,
  DEFAULT_EDITOR_PREVIEW_WIDTH,
  PREVIEW_HEIGHT_MAX,
  PREVIEW_HEIGHT_MIN,
  PREVIEW_WIDTH_MAX,
  PREVIEW_WIDTH_MIN,
} from '../../utils/imageEditorLayout'
import { nodeDisplayTitle } from '../../utils/nodeNaming'
import { CurrentImagePreview } from './CurrentImagePreview'
import { ResizablePreviewPane, PreviewWidthSplitter } from './ResizablePreviewPane'
import { StylePresetChips, type StylePresetChipsHandle } from './StylePresetChips'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { assetPathToBlobUrl } from '../../utils/assetStorage'
import { findScrollParent, scrollElementWithinContainer } from '../../utils/scrollWithin'

interface ImageEditorPanelProps {
  nodeId: string
  hidePreview?: boolean
}

const RATIO_MAP: Record<string, [number, number]> = {
  '1:1': [1920, 1920],
  '16:9': [2560, 1440],
  '9:16': [1440, 2560],
  '3:4': [1920, 2560],
  '4:3': [2560, 1920],
}

function sourceNodeLabel(type: string | undefined): string {
  if (type === 'text') return '文本'
  if (type === 'script') return '脚本'
  return '上游'
}

export function ImageEditorPanel({ nodeId, hidePreview = false }: ImageEditorPanelProps) {
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
  const [batchSize, setBatchSize] = useState(1)
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
  const referenceEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'reference')
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

    const [width, height] = RATIO_MAP[ratio] || [1024, 1024]
    const stylePreset = STYLE_PRESETS.find((p) => p.id === styleId)
    const finalPrompt = stylePreset ? applyStyleToPrompt(prompt, stylePreset) : prompt
    const finalNegative = [negativePrompt, stylePreset?.negativePrompt].filter(Boolean).join(', ')

    try {
      assertNoWarnEdgesForNode(nodeId, nodes, edges, 'image')
      const referenceImage = referenceEdge
        ? await resolveImageRefFromNodeId(referenceEdge.source, nodes, currentProjectId)
        : undefined
      const resultPath = await run(() =>
        window.api.model.beginGenerateImage({
          modelId,
          nodeId,
          prompt: finalPrompt,
          negativePrompt: finalNegative || undefined,
          width,
          height,
          batchSize,
          ...(referenceImage ? { referenceImage } : {}),
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
    referenceEdge,
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

  const generateButton = (
    <div className="flex items-center gap-2">
      {isGenerating && (
        <button
          type="button"
          onClick={() => void cancel()}
          className="px-2 py-1 text-xs text-danger border border-danger/40 rounded hover:bg-danger/10"
        >
          取消
        </button>
      )}
      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={generateDisabled}
        className="px-4 py-1.5 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isGenerating ? `生成中 ${progress}%` : '生成'}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col min-h-0 gap-3">
      <div ref={rowRef} className="flex min-h-0 items-start w-full">
        {!hidePreview && (
          <>
            <ResizablePreviewPane
              height={previewHeight}
              onHeightChange={commitPreviewHeight}
              minHeight={PREVIEW_HEIGHT_MIN}
              maxHeight={PREVIEW_HEIGHT_MAX}
              width={displayPreviewWidth}
              className="min-w-0"
            >
              <CurrentImagePreview
                imageSrc={data.imageSrc as string | undefined}
                imageAssetPath={data.imageAssetPath as string | undefined}
                fileName={displayTitle}
                isGenerating={isGenerating || data.isGenerating === true}
                progress={isGenerating ? progress : (data.progress as number | undefined)}
                recentOutputs={recentOutputs}
                onSelectRecent={handleSelectRecent}
                height={previewHeight - 12}
              />
            </ResizablePreviewPane>

            <PreviewWidthSplitter
              currentWidth={displayPreviewWidth}
              minWidth={PREVIEW_WIDTH_MIN}
              maxWidth={containerMaxWidth}
              height={previewHeight}
              onWidthPreview={setLivePreviewWidth}
              onWidthChange={(w) => {
                setLivePreviewWidth(null)
                commitPreviewWidth(w)
              }}
            />
          </>
        )}

        <div
          className="flex-1 min-w-[200px] space-y-2.5 overflow-y-auto lc-scroll min-h-0"
          style={hidePreview ? undefined : { maxHeight: previewHeight }}
        >
          <div>
            <label className="text-[10px] text-text-muted">模型</label>
            <select
              value={modelId}
              onChange={(e) => {
                setModelId(e.target.value)
                updateNodeData(nodeId, { modelId: e.target.value })
              }}
              className="w-full bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none"
            >
              <option value="">选择模型</option>
              {imageModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {modelId && (
              <div className="mt-1">
                <ModelCapabilityBadges profile={ui.profile} compact />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-text-muted">比例</label>
              <select
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                className="w-full bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none"
              >
                {['1:1', '16:9', '9:16', '3:4', '4:3'].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-16">
              <label className="text-[10px] text-text-muted">数量</label>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value, 10))}
                className="w-full bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none"
              >
                {[1, 2, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <StylePresetChips
            ref={styleChipsRef}
            styleId={styleId}
            prompt={prompt}
            negativePrompt={negativePrompt}
            onStyleChange={handleStyleChange}
            recommendedModelId={recommendedModelId}
            recommendedModelName={
              recommendedModelId
                ? imageModels.find((m) => m.id === recommendedModelId)?.name
                : undefined
            }
            currentModelId={modelId}
            onApplyRecommendedModel={(id) => {
              setModelId(id)
              updateNodeData(nodeId, { modelId: id })
            }}
          />

          <div>
            <label className="text-[10px] text-text-muted">参考图</label>
            {referenceEdge ? (
              <div className="flex gap-2 items-center mt-1">
                <div className="w-14 h-14 rounded overflow-hidden border border-border shrink-0">
                  <NodeImageThumb
                    projectId={currentProjectId}
                    nodeId={referenceEdge.source}
                    alt="参考图"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-text-secondary truncate">
                    来自节点 {referenceEdge.source.slice(0, 8)}…
                  </p>
                  {ui.supportsReferenceImage ? (
                    <span className="text-[10px] text-text-muted">
                      最多 {ui.maxReferenceImages} 张
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-300">当前模型不支持参考图</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-text-muted mt-1 italic">
                连接图片节点到 reference 口
              </p>
            )}
          </div>

          {warnings.length > 0 && (
            <div
              ref={warningsRef}
              id="generator-edge-warnings"
              className="rounded border border-amber-500/40 bg-amber-500/10 p-2 space-y-1"
            >
              {warnings.map((w, i) => (
                <p key={i} className="text-[10px] text-amber-200">
                  {w}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border pt-3 space-y-2">
        {isPromptSynced && promptSourceNode && (
          <div className="flex items-center justify-between gap-2 text-[10px] text-text-muted bg-bg-tertiary/40 rounded px-2 py-1.5">
            <span>
              🔗 来自{sourceNodeLabel(promptSourceNode.type)}节点
              {promptSourceNode.data?.title
                ? `「${String(promptSourceNode.data.title)}」`
                : ''}
            </span>
            {promptEdge && (
              <button
                type="button"
                onClick={() => removeEdge(promptEdge.id)}
                className="text-[var(--studio-accent)] hover:underline shrink-0"
              >
                解链编辑
              </button>
            )}
          </div>
        )}
        <div>
          <label className="text-[10px] text-text-muted">正向提示词</label>
          <ResizableTextarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要的画面..."
            minHeight={80}
          />
        </div>
        <div>
          <button
            type="button"
            onClick={handleNegativeToggle}
            className="text-[10px] text-text-muted hover:text-text-secondary mb-1"
          >
            高级 {negativeOpen ? '▴' : '▾'}
          </button>
          {negativeOpen && (
            <input
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="低质量, 模糊, 变形..."
              className="w-full bg-bg-tertiary text-text-primary text-xs p-2 rounded outline-none"
            />
          )}
        </div>
        <div className="flex justify-end pt-1">{generateButton}</div>
      </div>
    </div>
  )
}
