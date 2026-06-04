import { useState, useEffect } from 'react'
import type { TTSModelConfig } from '../../types/config'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { useModelGeneration } from '../../hooks/useModelGeneration'
import { handleError } from '../../utils/ErrorHandler'
import { importGeneratedMedia } from '../../utils/generatedMedia'

interface AudioGeneratorProps {
  nodeId: string
}

export function AudioGenerator({ nodeId }: AudioGeneratorProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const nodes = useCanvasStore((s) => s.nodes)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const node = nodes.find((n) => n.id === nodeId)
  const data = (node?.data ?? {}) as Record<string, unknown>

  const [text, setText] = useState((data.ttsText as string) || (data.prompt as string) || '')
  const [voice, setVoice] = useState((data.voice as string) || '')
  const [modelId, setModelId] = useState((data.modelId as string) || '')
  const [ttsModels, setTtsModels] = useState<TTSModelConfig[]>([])
  const { isGenerating, progress, run, cancel } = useModelGeneration(nodeId, (pct) => {
    updateNodeData(nodeId, { progress: pct })
  })

  useEffect(() => {
    void window.api.config.read().then((config) => {
      setTtsModels(config.tts_models)
      if (!modelId && config.settings.default_tts) {
        setModelId(config.settings.default_tts)
      }
    })
  }, [modelId])

  const handleGenerate = async () => {
    if (!modelId || !text.trim() || !currentProjectId) return

    updateNodeData(nodeId, { isGenerating: true, progress: 0, error: undefined })

    try {
      const resultPath = await run(() =>
        window.api.model.beginGenerateAudio({
          modelId,
          nodeId,
          text: text.trim(),
          voice: voice || undefined,
        }),
      )

      const { src, assetPath, fileName } = await importGeneratedMedia(
        currentProjectId,
        'audio',
        resultPath,
      )

      updateNodeData(nodeId, {
        audioSrc: src,
        ...(assetPath ? { audioAssetPath: assetPath } : {}),
        fileName,
        ttsText: text,
        voice,
        modelId,
        isGenerating: false,
        progress: 100,
      })
    } catch (err) {
      handleError(err, 'audioGenerate')
      updateNodeData(nodeId, { isGenerating: false, error: String(err) })
    }
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 space-y-2">
        <div>
          <label className="text-[10px] text-text-muted">配音文本</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入要合成的语音文本..."
            className="w-full h-16 bg-bg-tertiary text-text-primary text-xs p-2 rounded resize-none outline-none border border-border focus:border-accent"
          />
        </div>
        <div>
          <label className="text-[10px] text-text-muted">音色（可选）</label>
          <input
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            placeholder="如 longxiaochun"
            className="w-full bg-bg-tertiary text-text-primary text-xs p-2 rounded outline-none"
          />
        </div>
      </div>

      <div className="w-48 space-y-2">
        <div>
          <label className="text-[10px] text-text-muted">TTS 模型</label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none"
          >
            <option value="">选择模型</option>
            {ttsModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating || !modelId || !text.trim()}
            className="flex-1 bg-emerald-600 text-white text-sm py-1.5 rounded hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {isGenerating ? `生成中 ${progress}%` : '🎵 TTS 生成'}
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
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {ttsModels.length === 0 && (
          <p className="text-[10px] text-amber-400">请先在 ⚙️ 模型配置 → TTS 中添加模型</p>
        )}
      </div>
    </div>
  )
}
