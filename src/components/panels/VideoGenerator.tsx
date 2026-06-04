import { useState, useEffect } from 'react'
import type { VideoModelConfig } from '../../types/config'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { handleError } from '../../utils/ErrorHandler'
import { importGeneratedMedia } from '../../utils/generatedMedia'
import { resolveImageRefFromNodeId } from '../../utils/resolveImageRefForApi'
import { resolveVideoFrameRefForApi } from '../../utils/resolveVideoFrameRef'
import { NodeImageThumb } from '../common/NodeImageThumb'
import { useModelGeneration } from '../../hooks/useModelGeneration'
import {
  SEEDANCE_T2V_RATIOS,
  SEEDANCE_CAMERA_PROMPTS,
  DEFAULT_SEEDANCE_VIDEO_MODEL,
  getSeedanceCapabilities,
} from '../../constants/seedance'

interface VideoGeneratorProps {
  nodeId: string
}

export function VideoGenerator({ nodeId }: VideoGeneratorProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const node = nodes.find((n) => n.id === nodeId)
  const data = (node?.data ?? {}) as Record<string, unknown>

  const [prompt, setPrompt] = useState((data.prompt as string) || '')
  const [modelId, setModelId] = useState((data.modelId as string) || DEFAULT_SEEDANCE_VIDEO_MODEL.id)
  const [duration, setDuration] = useState((data.duration as number) || 5)
  const [ratio, setRatio] = useState((data.ratio as string) || '16:9')
  const [resolution, setResolution] = useState(
    (data.resolution as string) ||
      DEFAULT_SEEDANCE_VIDEO_MODEL.default_params.resolution,
  )
  const [generateAudio, setGenerateAudio] = useState(data.generateAudio !== false)
  const [camera, setCamera] = useState((data.camera as string) || '静止')
  const [videoModels, setVideoModels] = useState<VideoModelConfig[]>([])
  const { isGenerating, progress, lastError, run, cancel } = useModelGeneration(nodeId, (pct) => {
    updateNodeData(nodeId, { progress: pct })
  })

  const cameraPresets = Object.keys(SEEDANCE_CAMERA_PROMPTS)

  const firstFrameEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'firstFrame')
  const lastFrameEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'lastFrame')
  const hasSyncedFirstFrame = typeof data.firstFrameAssetPath === 'string' || typeof data.firstFrameSrc === 'string'
  const hasSyncedLastFrame = typeof data.lastFrameAssetPath === 'string' || typeof data.lastFrameSrc === 'string'

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
  const caps = getSeedanceCapabilities(selectedModel?.model ?? DEFAULT_SEEDANCE_VIDEO_MODEL.model)
  const resolutionOptions = caps.resolutions
  const durationOptions = caps.durations
  const hasFrameInput =
    !!firstFrameEdge || !!lastFrameEdge || hasSyncedFirstFrame || hasSyncedLastFrame
  const ratioOptions = hasFrameInput ? (['adaptive'] as const) : SEEDANCE_T2V_RATIOS

  useEffect(() => {
    if (hasFrameInput) {
      setRatio('adaptive')
      return
    }
    if (ratio === 'adaptive' || !SEEDANCE_T2V_RATIOS.includes(ratio as (typeof SEEDANCE_T2V_RATIOS)[number])) {
      setRatio('16:9')
    }
  }, [hasFrameInput, ratio])

  useEffect(() => {
    if (!selectedModel) return
    const modelDefaultRes =
      (selectedModel.default_params?.resolution as string) ||
      (caps.version === '1.0' ? '720p' : '1080p')
    if (!resolutionOptions.includes(resolution as (typeof resolutionOptions)[number])) {
      setResolution(modelDefaultRes)
    }
  }, [selectedModel, caps.version, resolution, resolutionOptions])

  const handleGenerate = async () => {
    if (!modelId || !prompt || !currentProjectId) return
    updateNodeData(nodeId, { isGenerating: true, progress: 0, error: undefined })

    try {
      const firstFrame = firstFrameEdge
        ? await resolveImageRefFromNodeId(firstFrameEdge.source, nodes, currentProjectId)
        : await resolveVideoFrameRefForApi(data, 'first', currentProjectId)
      const lastFrame = lastFrameEdge
        ? await resolveImageRefFromNodeId(lastFrameEdge.source, nodes, currentProjectId)
        : await resolveVideoFrameRefForApi(data, 'last', currentProjectId)

      const resultPath = await run(() =>
        window.api.model.beginGenerateVideo({
        modelId,
        nodeId,
        prompt,
        width: 1280,
        height: 720,
        duration,
        ratio,
        resolution,
        generateAudio,
        firstFrame,
        lastFrame,
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
        isGenerating: false,
        progress: 100,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      handleError(err, 'videoGenerate')
      updateNodeData(nodeId, { isGenerating: false, error: message })
    }
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-rose-400">
            {selectedModel?.name ?? 'Seedance 视频'}
          </span>
          <span className="text-[10px] text-text-muted">v{caps.version}</span>
          {isSeedance && !selectedModel?.api_key && (
            <span className="text-[10px] text-danger">未配置 ARK API Key</span>
          )}
        </div>
        <div>
          <label className="text-[10px] text-text-muted">画面描述（支持运镜自然语言）</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述视频画面和运动，例如：金色柴犬在阳光下的麦田中奔跑，广角跟拍，电影感..."
            className="w-full h-16 bg-bg-tertiary text-text-primary text-xs p-2 rounded resize-none outline-none"
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {(firstFrameEdge || hasSyncedFirstFrame) && (
            <div className="w-16 h-10 rounded overflow-hidden border border-border" title="首帧（分镜图）">
              <NodeImageThumb
                projectId={currentProjectId}
                nodeId={firstFrameEdge?.source}
                src={data.firstFrameSrc as string | undefined}
                assetPath={data.firstFrameAssetPath as string | undefined}
                alt="首帧"
              />
            </div>
          )}
          {(lastFrameEdge || hasSyncedLastFrame) && (
            <div className="w-16 h-10 rounded overflow-hidden border border-border" title="尾帧">
              <NodeImageThumb
                projectId={currentProjectId}
                nodeId={lastFrameEdge?.source}
                src={data.lastFrameSrc as string | undefined}
                assetPath={data.lastFrameAssetPath as string | undefined}
                alt="尾帧"
              />
            </div>
          )}
          {hasFrameInput && (
            <span className="text-[10px] text-text-muted self-center">
              已接入分镜图，将使用 adaptive 比例（图生视频）
            </span>
          )}
        </div>
      </div>

      <div className="w-64 space-y-2">
        <div>
          <label className="text-[10px] text-text-muted">模型</label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
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
        </div>
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
        {caps.supportsGenerateAudio && (
          <label className="flex items-center gap-2 text-[10px] text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={generateAudio}
              onChange={(e) => setGenerateAudio(e.target.checked)}
              className="rounded"
            />
            生成同步音频（对白 / 音效 / 背景音乐）
          </label>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating || !modelId || !prompt}
            className="flex-1 bg-rose-500 text-white text-sm py-1.5 rounded hover:bg-rose-600 disabled:opacity-50 transition"
          >
            {isGenerating ? `Seedance 生成中 ${progress}%` : '✨ Seedance 生成视频'}
          </button>
          {isGenerating && (
            <button
              type="button"
              onClick={() => void cancel()}
              className="px-2 text-xs text-danger border border-danger/40 rounded hover:bg-danger/10"
            >
              取消
            </button>
          )}
        </div>
        {isGenerating && (
          <div className="w-full bg-bg-tertiary rounded-full h-1.5">
            <div
              className="bg-rose-500 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {(lastError || (typeof data.error === 'string' && data.error)) && !isGenerating && (
          <p className="text-[10px] text-danger leading-snug break-words">
            {lastError || (data.error as string)}
          </p>
        )}
      </div>
    </div>
  )
}
