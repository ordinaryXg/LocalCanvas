import { useState, useEffect, useRef } from 'react'
import type { TTSModelConfig } from '../../types/config'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { useModelGeneration } from '../../hooks/useModelGeneration'
import { useNodeMediaUpload } from '../../hooks/useNodeMedia'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { handleError, showToast } from '../../utils/ErrorHandler'
import { importGeneratedMedia } from '../../utils/generatedMedia'
import { ResizableTextarea } from '../common/ResizableTextarea'
import { generateNodeId } from '../../utils/id'
import { useT } from '../../i18n'
import {
  AUDIO_CHIP_EMPTY_WIDTH,
  AUDIO_CHIP_HEIGHT,
} from '../../utils/audioNodeDisplay'
import { CANVAS_NODE_SHELL_PAD } from '../../utils/imageNodeDisplay'

interface AudioGeneratorProps {
  nodeId: string
}

export function AudioGenerator({ nodeId }: AudioGeneratorProps) {
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMedia = useNodeMediaUpload(nodeId, 'audio')
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const addNode = useCanvasStore((s) => s.addNode)
  const addConnection = useCanvasStore((s) => s.addConnection)
  const nodes = useCanvasStore((s) => s.nodes)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const node = nodes.find((n) => n.id === nodeId)
  const data = (node?.data ?? {}) as Record<string, unknown>

  const [text, setText] = useState((data.ttsText as string) || (data.prompt as string) || '')
  const [voice, setVoice] = useState((data.voice as string) || '')
  const [modelId, setModelId] = useState((data.modelId as string) || '')
  const [ttsModels, setTtsModels] = useState<TTSModelConfig[]>([])
  const [separating, setSeparating] = useState(false)
  const [demucsAvailable, setDemucsAvailable] = useState<boolean | null>(null)
  const { isGenerating, progress, run, cancel } = useModelGeneration(nodeId, (pct) => {
    updateNodeData(nodeId, { progress: pct })
  })

  const hasAudio = !!(data.audioSrc || data.audioAssetPath)
  const audioAssetPath =
    typeof data.audioAssetPath === 'string' ? data.audioAssetPath : undefined
  const inlineAudioSrc = typeof data.audioSrc === 'string' ? data.audioSrc : undefined
  const fileName = typeof data.fileName === 'string' ? data.fileName : undefined

  const { src: previewSrc } = useLazyAssetBlob(
    currentProjectId,
    audioAssetPath,
    inlineAudioSrc,
  )
  const previewAudioSrc = previewSrc ?? inlineAudioSrc

  const defaultChipWidth = AUDIO_CHIP_EMPTY_WIDTH + CANVAS_NODE_SHELL_PAD * 2
  const defaultChipHeight = AUDIO_CHIP_HEIGHT + CANVAS_NODE_SHELL_PAD * 2

  useEffect(() => {
    void window.api.config.read().then((config) => {
      setTtsModels(config.tts_models)
      if (!modelId && config.settings.default_tts) {
        setModelId(config.settings.default_tts)
      }
    })
    void window.api.audio.checkDemucs().then((r) => setDemucsAvailable(r.available))
  }, [modelId])

  const handleGenerate = async () => {
    if (!modelId || !text.trim() || !currentProjectId) return

    updateNodeData(nodeId, { isGenerating: true, progress: 0, error: undefined })

    try {
      const { result: resultPath } = await run(() =>
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

  const handleSeparateVocals = async () => {
    if (!currentProjectId || !hasAudio || !node) return
    setSeparating(true)
    try {
      const result = await window.api.audio.separateVocals({
        projectId: currentProjectId,
        audioAssetPath: data.audioAssetPath as string | undefined,
      })

      const vocalsMedia = await importGeneratedMedia(currentProjectId, 'audio', result.vocalsPath)
      const instMedia = await importGeneratedMedia(
        currentProjectId,
        'audio',
        result.instrumentalPath,
      )

      const nodeWidth = node.width ?? node.measured?.width ?? 260
      const vocalsId = generateNodeId('audio')
      const instId = generateNodeId('audio')

      addNode({
        id: vocalsId,
        type: 'audio',
        position: { x: node.position.x + nodeWidth + 60, y: node.position.y - 40 },
        width: defaultChipWidth,
        height: defaultChipHeight,
        data: {
          audioSrc: vocalsMedia.src,
          audioAssetPath: vocalsMedia.assetPath,
          fileName: vocalsMedia.fileName || 'vocals.wav',
          label: t('audio.vocals'),
        },
      })

      addNode({
        id: instId,
        type: 'audio',
        position: { x: node.position.x + nodeWidth + 60, y: node.position.y + 120 },
        width: defaultChipWidth,
        height: defaultChipHeight,
        data: {
          audioSrc: instMedia.src,
          audioAssetPath: instMedia.assetPath,
          fileName: instMedia.fileName || 'instrumental.wav',
          label: t('audio.instrumental'),
        },
      })

      addConnection({
        source: nodeId,
        target: vocalsId,
        sourceHandle: 'audio',
        targetHandle: 'audio',
      })
      addConnection({
        source: nodeId,
        target: instId,
        sourceHandle: 'audio',
        targetHandle: 'audio',
      })

      showToast(
        result.mode === 'demucs'
          ? t('audio.separateDoneDemucs')
          : result.mode === 'http_api'
            ? t('audio.separateDoneHttp')
            : t('audio.separateDoneFfmpeg'),
        'info',
      )
    } catch (err) {
      handleError(err, 'audioSeparate')
    } finally {
      setSeparating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 pb-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs rounded border border-border hover:border-[var(--node-audio)]/60 text-text-primary"
          >
            {hasAudio ? '替换音频' : '上传音频'}
          </button>
          {fileName && <span className="text-[10px] text-text-muted truncate">{fileName}</span>}
        </div>
        {previewAudioSrc ? (
          <audio controls preload="metadata" src={previewAudioSrc} className="w-full h-9 nodrag" />
        ) : (
          <p className="text-[10px] text-text-muted">暂无音频，可上传或使用下方 TTS 生成</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadMedia(file)
            e.target.value = ''
          }}
        />
      </div>

      <div className="flex gap-4 items-start">
      <div className="flex-1 space-y-2">
        <div>
          <label className="text-[10px] text-text-muted">配音文本</label>
          <ResizableTextarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入要合成的语音文本..."
            minHeight={100}
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
        <button
          type="button"
          onClick={() => void handleSeparateVocals()}
          disabled={!hasAudio || separating}
          className="w-full py-1.5 text-xs border border-border rounded hover:border-accent/50 disabled:opacity-50"
          title={
            demucsAvailable === false
              ? t('audio.separateHintFfmpeg')
              : t('audio.separateHintDemucs')
          }
        >
          {separating ? t('audio.separating') : t('audio.separateVocals')}
        </button>
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
    </div>
  )
}
