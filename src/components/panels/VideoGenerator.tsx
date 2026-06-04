import { useState, useEffect } from 'react'
import type { VideoModelConfig } from '../../types/config'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { handleError } from '../../utils/ErrorHandler'
import { importGeneratedMedia } from '../../utils/generatedMedia'
import { resolveImageRefFromNodeId } from '../../utils/resolveImageRefForApi'
import type { ModelProgressEvent } from '../../types/ipc'
import {
  SEEDANCE_RATIOS,
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
  const [resolution, setResolution] = useState((data.resolution as string) || '1080p')
  const [generateAudio, setGenerateAudio] = useState(data.generateAudio !== false)
  const [camera, setCamera] = useState((data.camera as string) || '静止')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [videoModels, setVideoModels] = useState<VideoModelConfig[]>([])

  const cameraPresets = Object.keys(SEEDANCE_CAMERA_PROMPTS)

  const firstFrameEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'firstFrame')
  const lastFrameEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'lastFrame')

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

  const getNodeImageSrc = (id: string): string | undefined => {
    const n = nodes.find((node) => node.id === id)
    const src = n?.data?.imageSrc
    return typeof src === 'string' ? src : undefined
  }

  const handleGenerate = async () => {
    if (!modelId || !prompt) return
    setIsGenerating(true)
    setProgress(0)
    updateNodeData(nodeId, { isGenerating: true, progress: 0, error: undefined })

    const unsub = window.api.on('model:progress', (...args: unknown[]) => {
      const p = args[0] as ModelProgressEvent
      if (p.nodeId === nodeId) {
        setProgress(p.percentage)
        updateNodeData(nodeId, { progress: p.percentage })
      }
    })

    try {
      const firstFrame = firstFrameEdge
        ? await resolveImageRefFromNodeId(firstFrameEdge.source, nodes, currentProjectId)
        : undefined
      const lastFrame = lastFrameEdge
        ? await resolveImageRefFromNodeId(lastFrameEdge.source, nodes, currentProjectId)
        : undefined

      const resultPath = await window.api.model.generateVideo({
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
      })

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
      setProgress(100)
    } catch (err) {
      handleError(err, 'videoGenerate')
      updateNodeData(nodeId, { isGenerating: false, error: String(err) })
    } finally {
      unsub()
      setIsGenerating(false)
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
        <div className="flex gap-2">
          {firstFrameEdge && (
            <div className="w-16 h-10 rounded overflow-hidden border border-border" title="首帧">
              <img
                src={getNodeImageSrc(firstFrameEdge.source)}
                className="w-full h-full object-cover"
                alt="首帧"
              />
            </div>
          )}
          {lastFrameEdge && (
            <div className="w-16 h-10 rounded overflow-hidden border border-border" title="尾帧">
              <img
                src={getNodeImageSrc(lastFrameEdge.source)}
                className="w-full h-full object-cover"
                alt="尾帧"
              />
            </div>
          )}
          {(firstFrameEdge || lastFrameEdge) && (
            <span className="text-[10px] text-text-muted self-center">首尾帧已连接，将自动使用 adaptive 比例</span>
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
              disabled={!!firstFrameEdge || !!lastFrameEdge}
              className="w-full bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none disabled:opacity-50"
            >
              {SEEDANCE_RATIOS.filter((r) => r !== 'adaptive' || caps.supportsLastFrame).map((r) => (
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
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !modelId || !prompt}
          className="w-full bg-rose-500 text-white text-sm py-1.5 rounded hover:bg-rose-600 disabled:opacity-50 transition"
        >
          {isGenerating ? `Seedance 生成中 ${progress}%` : '✨ Seedance 生成视频'}
        </button>
        {isGenerating && (
          <div className="w-full bg-bg-tertiary rounded-full h-1.5">
            <div
              className="bg-rose-500 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
