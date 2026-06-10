import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { VideoModelConfig } from '../../types/config'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { useNodeMediaUpload } from '../../hooks/useNodeMedia'
import { handleError, showToast } from '../../utils/ErrorHandler'
import {
  assertNoWarnEdgesForNode,
  GenerationBlockedError,
  GENERATION_CONSUMED_HANDLES,
} from '../../capabilities/generation-guard'
import { collectInboundEdgeWarnings } from '../../capabilities/edge-compat'
import {
  getVideoGeneratorUi,
  listUnsupportedInboundSlots,
} from '../../capabilities/generator-ui'
import { ModelCapabilityBadges } from './ModelCapabilityBadges'
import { importGeneratedMedia } from '../../utils/generatedMedia'
import { resolveImageRefFromNodeId } from '../../utils/resolveImageRefForApi'
import { resolveMediaRefFromNodeId } from '../../utils/resolveMediaRefForApi'
import { resolveVideoFrameRefForApi } from '../../utils/resolveVideoFrameRef'
import { NodeImageThumb } from '../common/NodeImageThumb'
import { useModelGeneration } from '../../hooks/useModelGeneration'
import { ResizableTextarea } from '../common/ResizableTextarea'
import { STYLE_PRESETS, applyStyleToPrompt, getStylePreset } from '../../constants/stylePresets'
import { StylePresetChips } from './StylePresetChips'
import {
  SEEDANCE_T2V_RATIOS,
  SEEDANCE_CAMERA_PROMPTS,
  DEFAULT_SEEDANCE_VIDEO_MODEL,
} from '../../constants/seedance'
import {
  isVideoReferenceImageHandle,
  referenceIndexFromHandle,
} from '../../utils/videoReferenceSlots'
import {
  DEFAULT_EDITOR_PREVIEW_HEIGHT,
  DEFAULT_EDITOR_PREVIEW_WIDTH,
  PREVIEW_HEIGHT_MAX,
  PREVIEW_HEIGHT_MIN,
  PREVIEW_WIDTH_MAX,
  PREVIEW_WIDTH_MIN,
} from '../../utils/imageEditorLayout'
import { nodeDisplayTitle } from '../../utils/nodeNaming'
import { CurrentVideoPreview } from './CurrentVideoPreview'
import { ResizablePreviewPane, PreviewWidthSplitter } from './ResizablePreviewPane'
import { trimVideoAsset, resolveAssetAbsolutePath } from '../../hooks/useCompose'
import { generateNodeId } from '../../utils/id'

interface VideoEditorPanelProps {
  nodeId: string
  hidePreview?: boolean
}

export function VideoEditorPanel({ nodeId, hidePreview = false }: VideoEditorPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMedia = useNodeMediaUpload(nodeId, 'video')
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const addNode = useCanvasStore((s) => s.addNode)
  const removeEdge = useCanvasStore((s) => s.removeEdge)
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)

  const node = nodes.find((n) => n.id === nodeId)
  const data = (node?.data ?? {}) as Record<string, unknown>
  const rowRef = useRef<HTMLDivElement>(null)
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

  const editorUi = (data.editorUi as {
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
      updateNodeData(nodeId, { editorUi: { ...editorUi, previewHeight: clamped } })
    },
    [editorUi, nodeId, updateNodeData],
  )

  const commitPreviewWidth = useCallback(
    (nextWidth: number) => {
      const clamped = Math.min(containerMaxWidth, Math.max(PREVIEW_WIDTH_MIN, nextWidth))
      updateNodeData(nodeId, { editorUi: { ...editorUi, previewWidth: clamped } })
    },
    [containerMaxWidth, editorUi, nodeId, updateNodeData],
  )

  const [prompt, setPrompt] = useState((data.prompt as string) || '')
  const [modelId, setModelId] = useState((data.modelId as string) || DEFAULT_SEEDANCE_VIDEO_MODEL.id)
  const [duration, setDuration] = useState((data.duration as number) || 5)
  const [ratio, setRatio] = useState((data.ratio as string) || '16:9')
  const [resolution, setResolution] = useState(
    (data.resolution as string) || DEFAULT_SEEDANCE_VIDEO_MODEL.default_params.resolution,
  )
  const [generateAudio, setGenerateAudio] = useState(data.generateAudio !== false)
  const [camera, setCamera] = useState((data.camera as string) || '静止')
  const [styleId, setStyleId] = useState((data.styleId as string) || '')
  const [negativePrompt, setNegativePrompt] = useState((data.negativePrompt as string) || '')
  const [videoModels, setVideoModels] = useState<VideoModelConfig[]>([])

  const { isGenerating, progress, lastError, run, cancel } = useModelGeneration(nodeId, (pct) => {
    updateNodeData(nodeId, { progress: pct })
  })

  const cameraPresets = Object.keys(SEEDANCE_CAMERA_PROMPTS)
  const promptEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'prompt')
  const promptSourceNode = promptEdge ? nodes.find((n) => n.id === promptEdge.source) : undefined
  const isPromptSynced =
    !!promptEdge &&
    (promptSourceNode?.type === 'text' || promptSourceNode?.type === 'script')

  const firstFrameEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'firstFrame')
  const lastFrameEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'lastFrame')
  const videoRefEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'video')
  const audioRefEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'audio')
  const referenceEdges = edges
    .filter(
      (e) =>
        e.target === nodeId && e.targetHandle && isVideoReferenceImageHandle(e.targetHandle),
    )
    .sort(
      (a, b) =>
        referenceIndexFromHandle(a.targetHandle!) - referenceIndexFromHandle(b.targetHandle!),
    )

  const hasSyncedFirstFrame =
    typeof data.firstFrameAssetPath === 'string' || typeof data.firstFrameSrc === 'string'
  const hasSyncedLastFrame =
    typeof data.lastFrameAssetPath === 'string' || typeof data.lastFrameSrc === 'string'

  useEffect(() => {
    void window.api.config.read().then((config) => {
      setVideoModels(config.video_models)
      if (!modelId && config.settings.default_video_model) {
        setModelId(config.settings.default_video_model)
      }
    })
  }, [modelId])

  const selectedModel = videoModels.find((m) => m.id === modelId)
  const isSeedance = selectedModel?.provider === 'volcengine_seedance'
  const ui = getVideoGeneratorUi(modelId, selectedModel?.model)
  const resolutionOptions = ui.resolutions
  const durationOptions = ui.durations
  const connectedHandles = edges
    .filter((e) => e.target === nodeId && e.targetHandle)
    .map((e) => e.targetHandle as string)
  const unsupportedSlotWarnings = listUnsupportedInboundSlots(ui, connectedHandles)
  const edgeWarnings = useMemo(
    () =>
      collectInboundEdgeWarnings(nodeId, nodes, edges, GENERATION_CONSUMED_HANDLES.video),
    [nodeId, nodes, edges],
  )
  const warnings = useMemo(
    () => [...edgeWarnings, ...unsupportedSlotWarnings],
    [edgeWarnings, unsupportedSlotWarnings],
  )

  const hasFrameInput =
    !!firstFrameEdge || !!lastFrameEdge || hasSyncedFirstFrame || hasSyncedLastFrame
  const ratioOptions = hasFrameInput ? (['adaptive'] as const) : SEEDANCE_T2V_RATIOS

  useEffect(() => {
    if (hasFrameInput) {
      setRatio('adaptive')
      return
    }
    if (
      ratio === 'adaptive' ||
      !SEEDANCE_T2V_RATIOS.includes(ratio as (typeof SEEDANCE_T2V_RATIOS)[number])
    ) {
      setRatio('16:9')
    }
  }, [hasFrameInput, ratio])

  useEffect(() => {
    if (!selectedModel) return
    const modelDefaultRes =
      (selectedModel.default_params?.resolution as string) ||
      (ui.versionLabel === '1.0' ? '720p' : '1080p')
    if (!resolutionOptions.includes(resolution as (typeof resolutionOptions)[number])) {
      setResolution(modelDefaultRes)
    }
  }, [selectedModel, ui.versionLabel, resolution, resolutionOptions])

  const handleTrim = useCallback(
    async (start: number, end: number) => {
      if (!currentProjectId || !data.videoAssetPath) {
        showToast('请先保存视频到项目资产', 'error')
        return
      }
      try {
        const absoluteInput = await resolveAssetAbsolutePath(
          currentProjectId,
          data.videoAssetPath as string,
        )
        const trimmed = await trimVideoAsset(currentProjectId, absoluteInput, start, end)
        const currentNode = useCanvasStore.getState().nodes.find((n) => n.id === nodeId)
        addNode({
          id: generateNodeId('video'),
          type: 'video',
          position: {
            x: (currentNode?.position.x ?? 0) + 40,
            y: (currentNode?.position.y ?? 0) + 40,
          },
          width: 280,
          height: 360,
          data: {
            videoAssetPath: trimmed.relativePath,
            videoSrc: trimmed.blobUrl,
            fileName: `trim-${start.toFixed(1)}-${end.toFixed(1)}.mp4`,
            duration: end - start,
          },
        })
        showToast('已创建裁切视频节点', 'info')
      } catch (error) {
        handleError(error, 'trim')
      }
    },
    [addNode, currentProjectId, data.videoAssetPath, nodeId],
  )

  const handleGenerate = async () => {
    if (!modelId || !prompt || !currentProjectId) return
    updateNodeData(nodeId, { isGenerating: true, progress: 0, error: undefined })

    try {
      assertNoWarnEdgesForNode(nodeId, nodes, edges, 'video')
      const preset = STYLE_PRESETS.find((p) => p.id === styleId)
      const finalPrompt = preset ? applyStyleToPrompt(prompt, preset) : prompt

      const firstFrame = firstFrameEdge
        ? await resolveImageRefFromNodeId(firstFrameEdge.source, nodes, currentProjectId)
        : await resolveVideoFrameRefForApi(data, 'first', currentProjectId)
      const lastFrame = lastFrameEdge
        ? await resolveImageRefFromNodeId(lastFrameEdge.source, nodes, currentProjectId)
        : await resolveVideoFrameRefForApi(data, 'last', currentProjectId)
      const referenceVideo = videoRefEdge
        ? await resolveMediaRefFromNodeId(videoRefEdge.source, nodes, currentProjectId)
        : undefined
      const referenceAudio = audioRefEdge
        ? await resolveMediaRefFromNodeId(audioRefEdge.source, nodes, currentProjectId)
        : undefined
      const referenceImages = (
        await Promise.all(
          referenceEdges.map((edge) =>
            resolveImageRefFromNodeId(edge.source, nodes, currentProjectId),
          ),
        )
      ).filter((url): url is string => !!url)

      const resultPath = await run(() =>
        window.api.model.beginGenerateVideo({
          modelId,
          nodeId,
          prompt: finalPrompt,
          width: 1280,
          height: 720,
          duration,
          ratio,
          resolution,
          generateAudio,
          firstFrame,
          lastFrame,
          ...(referenceImages.length > 0 ? { referenceImages } : {}),
          ...(referenceVideo ? { referenceVideo } : {}),
          ...(referenceAudio ? { referenceAudio } : {}),
          camera,
        }),
      )

      const { src, assetPath, fileName } = await importGeneratedMedia(
        currentProjectId,
        'video',
        resultPath,
      )

      updateNodeData(nodeId, {
        videoSrc: src,
        ...(assetPath ? { videoAssetPath: assetPath } : {}),
        fileName,
        prompt,
        modelId,
        duration,
        ratio,
        resolution,
        generateAudio,
        camera,
        styleId: styleId || undefined,
        isGenerating: false,
        progress: 100,
      })
    } catch (err) {
      if (err instanceof GenerationBlockedError) {
        showToast(err.message, 'error')
        updateNodeData(nodeId, { isGenerating: false })
        return
      }
      const message = err instanceof Error ? err.message : String(err)
      handleError(err, 'videoGenerate')
      updateNodeData(nodeId, { isGenerating: false, error: message })
    }
  }

  const generateDisabled = isGenerating || !modelId || !prompt || edgeWarnings.length > 0
  const displayTitle = node ? nodeDisplayTitle(node, '视频') : '视频'
  const videoAssetPath =
    typeof data.videoAssetPath === 'string' ? data.videoAssetPath : undefined
  const hasVideoAsset = !!(data.videoSrc || videoAssetPath)
  const videoFileName = typeof data.fileName === 'string' ? data.fileName : undefined

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
        className="px-4 py-1.5 bg-[var(--node-video)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isGenerating ? `生成中 ${progress}%` : '生成视频'}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col min-h-0 gap-3">
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 text-xs rounded border border-border hover:border-[var(--node-video)]/60 text-text-primary"
        >
          {hasVideoAsset ? '替换视频' : '上传视频'}
        </button>
        {videoFileName && (
          <span className="text-[10px] text-text-muted truncate">{videoFileName}</span>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadMedia(file)
            e.target.value = ''
          }}
        />
      </div>

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
              <CurrentVideoPreview
                videoSrc={data.videoSrc as string | undefined}
                videoAssetPath={videoAssetPath}
                fileName={(data.fileName as string) || displayTitle}
                isGenerating={isGenerating || data.isGenerating === true}
                progress={isGenerating ? progress : (data.progress as number | undefined)}
                firstFrameSrc={data.firstFrameSrc as string | undefined}
                firstFrameAssetPath={data.firstFrameAssetPath as string | undefined}
                onTrim={videoAssetPath ? handleTrim : undefined}
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
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--node-video)]">
              {selectedModel?.name ?? 'Seedance 视频'}
            </span>
            <span className="text-[10px] text-text-muted">v{ui.versionLabel}</span>
            {isSeedance && !selectedModel?.api_key && (
              <span className="text-[10px] text-danger">未配置 API Key</span>
            )}
          </div>

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
              {videoModels.length === 0 && (
                <option value={DEFAULT_SEEDANCE_VIDEO_MODEL.id}>Doubao Seedance 2.0（待配置）</option>
              )}
              {videoModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <div className="mt-1">
              <ModelCapabilityBadges profile={ui.profile} compact />
            </div>
          </div>

          <StylePresetChips
            styleId={styleId}
            prompt={prompt}
            negativePrompt={negativePrompt}
            onStyleChange={(next) => {
              setStyleId(next)
              updateNodeData(nodeId, { styleId: next || undefined })
            }}
            recommendedModelId={getStylePreset(styleId)?.recommendedVideoModel}
            recommendedModelName={
              getStylePreset(styleId)?.recommendedVideoModel
                ? videoModels.find((m) => m.id === getStylePreset(styleId)?.recommendedVideoModel)
                    ?.name
                : undefined
            }
            currentModelId={modelId}
            onApplyRecommendedModel={(id) => {
              setModelId(id)
              updateNodeData(nodeId, { modelId: id })
            }}
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-text-muted">比例</label>
              <select
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                disabled={hasFrameInput}
                className="w-full bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none disabled:opacity-50"
              >
                {ratioOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-text-muted">分辨率</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none"
              >
                {resolutionOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="w-16">
              <label className="text-[10px] text-text-muted">时长</label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                className="w-full bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none"
              >
                {durationOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}s
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-text-muted">运镜</label>
              <select
                value={camera}
                onChange={(e) => setCamera(e.target.value)}
                className="w-full bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none"
              >
                {cameraPresets.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {ui.supportsGenerateAudio && (
            <label className="flex items-center gap-2 text-[10px] text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={generateAudio}
                onChange={(e) => setGenerateAudio(e.target.checked)}
                className="rounded"
              />
              生成同步音频
            </label>
          )}

          <div>
            <label className="text-[10px] text-text-muted">输入素材</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {(firstFrameEdge || hasSyncedFirstFrame) && (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-14 h-10 rounded overflow-hidden border border-border">
                    <NodeImageThumb
                      projectId={currentProjectId}
                      nodeId={firstFrameEdge?.source}
                      src={data.firstFrameSrc as string | undefined}
                      assetPath={data.firstFrameAssetPath as string | undefined}
                      alt="首帧"
                    />
                  </div>
                  <span className="text-[9px] text-text-muted">首帧</span>
                </div>
              )}
              {(lastFrameEdge || hasSyncedLastFrame) && (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-14 h-10 rounded overflow-hidden border border-border">
                    <NodeImageThumb
                      projectId={currentProjectId}
                      nodeId={lastFrameEdge?.source}
                      src={data.lastFrameSrc as string | undefined}
                      assetPath={data.lastFrameAssetPath as string | undefined}
                      alt="尾帧"
                    />
                  </div>
                  <span className="text-[9px] text-text-muted">尾帧</span>
                </div>
              )}
              {referenceEdges.map((edge) => (
                <div key={edge.id} className="flex flex-col items-center gap-0.5">
                  <div className="w-10 h-10 rounded overflow-hidden border border-border">
                    <NodeImageThumb projectId={currentProjectId} nodeId={edge.source} alt="参考" />
                  </div>
                  <span className="text-[9px] text-text-muted">
                    参考{referenceIndexFromHandle(edge.targetHandle!) + 1}
                  </span>
                </div>
              ))}
              {!firstFrameEdge &&
                !hasSyncedFirstFrame &&
                !lastFrameEdge &&
                !hasSyncedLastFrame &&
                referenceEdges.length === 0 && (
                  <p className="text-[10px] text-text-muted italic">连接图片/视频/音频到输入口</p>
                )}
            </div>
            {hasFrameInput && (
              <p className="text-[10px] text-text-muted mt-1">已接入分镜图，比例 adaptive</p>
            )}
          </div>

          {warnings.length > 0 && (
            <div
              ref={warningsRef}
              className="rounded border border-amber-500/40 bg-amber-500/10 p-2 space-y-1"
            >
              {warnings.map((w, i) => (
                <p key={i} className="text-[10px] text-amber-200">
                  {w}
                </p>
              ))}
            </div>
          )}

          {(lastError || (typeof data.error === 'string' && data.error)) && !isGenerating && (
            <p className="text-[10px] text-danger leading-snug break-words">
              {lastError || (data.error as string)}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border pt-3 space-y-2">
        {isPromptSynced && promptSourceNode && (
          <div className="flex items-center justify-between gap-2 text-[10px] text-text-muted bg-bg-tertiary/40 rounded px-2 py-1.5">
            <span>
              🔗 来自
              {promptSourceNode.type === 'text'
                ? '文本'
                : promptSourceNode.type === 'script'
                  ? '脚本'
                  : '上游'}
              节点
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
          <label className="text-[10px] text-text-muted">画面描述（支持运镜自然语言）</label>
          <ResizableTextarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述视频画面和运动，例如：金色柴犬在麦田中奔跑，广角跟拍，电影感..."
            minHeight={80}
          />
        </div>
        <div className="flex justify-end pt-1">{generateButton}</div>
      </div>
    </div>
  )
}
