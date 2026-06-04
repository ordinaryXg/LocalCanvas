import { useState, useEffect } from 'react'
import type { ImageModelConfig } from '../../types/config'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { handleError } from '../../utils/ErrorHandler'
import { importGeneratedMedia } from '../../utils/generatedMedia'
import type { ModelProgressEvent } from '../../types/ipc'

interface ImageGeneratorProps {
  nodeId: string
}

const RATIO_MAP: Record<string, [number, number]> = {
  '1:1': [1920, 1920],
  '16:9': [2560, 1440],
  '9:16': [1440, 2560],
  '3:4': [1920, 2560],
  '4:3': [2560, 1920],
}

export function ImageGenerator({ nodeId }: ImageGeneratorProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const nodes = useCanvasStore((s) => s.nodes)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const node = nodes.find((n) => n.id === nodeId)
  const data = (node?.data ?? {}) as Record<string, unknown>

  const [prompt, setPrompt] = useState((data.prompt as string) || '')
  const [negativePrompt, setNegativePrompt] = useState((data.negativePrompt as string) || '')
  const [modelId, setModelId] = useState((data.modelId as string) || '')
  const [ratio, setRatio] = useState((data.ratio as string) || '16:9')
  const [batchSize, setBatchSize] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [imageModels, setImageModels] = useState<ImageModelConfig[]>([])

  useEffect(() => {
    void window.api.config.read().then((config) => {
      setImageModels(config.image_models)
      if (!modelId && config.settings.default_image_model) {
        setModelId(config.settings.default_image_model)
      }
    })
  }, [modelId])

  const handleGenerate = async () => {
    if (!modelId || !prompt) return
    setIsGenerating(true)
    setProgress(0)
    updateNodeData(nodeId, { isGenerating: true, progress: 0, error: undefined })

    const [width, height] = RATIO_MAP[ratio] || [1024, 1024]

    const unsub = window.api.on('model:progress', (...args: unknown[]) => {
      const p = args[0] as ModelProgressEvent
      if (p.nodeId === nodeId) {
        setProgress(p.percentage)
        updateNodeData(nodeId, { progress: p.percentage })
      }
    })

    try {
      const resultPath = await window.api.model.generateImage({
        modelId,
        nodeId,
        prompt,
        negativePrompt,
        width,
        height,
        batchSize,
      })

      const { src, assetPath, fileName } = await importGeneratedMedia(
        currentProjectId,
        'image',
        resultPath,
      )

      updateNodeData(nodeId, {
        imageSrc: src,
        ...(assetPath ? { imageAssetPath: assetPath } : {}),
        fileName,
        prompt,
        negativePrompt,
        modelId,
        ratio,
        isGenerating: false,
        progress: 100,
      })
      setProgress(100)
    } catch (err) {
      handleError(err, 'imageGenerate')
      updateNodeData(nodeId, { isGenerating: false, error: String(err) })
    } finally {
      unsub()
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 space-y-2">
        <div>
          <label className="text-[10px] text-text-muted">正向提示词</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要的画面..."
            className="w-full h-16 bg-bg-tertiary text-text-primary text-xs p-2 rounded resize-none outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-text-muted">反向提示词</label>
          <input
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="低质量, 模糊, 变形..."
            className="w-full bg-bg-tertiary text-text-primary text-xs p-2 rounded outline-none"
          />
        </div>
      </div>

      <div className="w-56 space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-text-muted">模型</label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none"
            >
              <option value="">选择模型</option>
              {imageModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-20">
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
        </div>
        <div className="flex gap-2">
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
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating || !modelId || !prompt}
            className="flex-1 bg-cyan-600 text-white text-sm py-1.5 rounded hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isGenerating ? `生成中 ${progress}%` : '✨ 生成'}
          </button>
        </div>
        {isGenerating && (
          <div className="w-full bg-bg-tertiary rounded-full h-1.5">
            <div
              className="bg-cyan-500 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
