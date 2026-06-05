import { useState, useEffect } from 'react'
import type { ImageModelConfig } from '../../types/config'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { handleError, showToast } from '../../utils/ErrorHandler'
import {
  assertNoWarnEdgesForNode,
  GenerationBlockedError,
} from '../../capabilities/generation-guard'
import { getImageGeneratorUi } from '../../capabilities/generator-ui'
import { ModelCapabilityBadges } from './ModelCapabilityBadges'
import { NodeImageThumb } from '../common/NodeImageThumb'
import { resolveImageRefFromNodeId } from '../../utils/resolveImageRefForApi'
import { importGeneratedMedia } from '../../utils/generatedMedia'
import { useModelGeneration } from '../../hooks/useModelGeneration'
import { ResizableTextarea } from '../common/ResizableTextarea'
import { STYLE_PRESETS, applyStyleToPrompt } from '../../constants/stylePresets'
import { useI18nStore } from '../../i18n'
import { compileForProject } from '../../hooks/useCompiledPrompt'
import { FLUID_RESONANCE } from '../../constants/fluidFeatures'
import { FakeElementChecklist, type FakeItem } from '../negentropy/FakeElementChecklist'
import { applyNegentropy } from '../../utils/negentropy'

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
  const edges = useCanvasStore((s) => s.edges)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const node = nodes.find((n) => n.id === nodeId)
  const data = (node?.data ?? {}) as Record<string, unknown>

  const [prompt, setPrompt] = useState((data.prompt as string) || '')
  const [negativePrompt, setNegativePrompt] = useState((data.negativePrompt as string) || '')
  const [modelId, setModelId] = useState((data.modelId as string) || '')
  const [ratio, setRatio] = useState((data.ratio as string) || '16:9')
  const [batchSize, setBatchSize] = useState(1)
  const [styleId, setStyleId] = useState((data.styleId as string) || '')
  const locale = useI18nStore((s) => s.locale)
  const [imageModels, setImageModels] = useState<ImageModelConfig[]>([])
  const [fakeItems, setFakeItems] = useState<FakeItem[] | null>(null)
  const { isGenerating, progress, run, cancel } = useModelGeneration(nodeId, (pct) => {
    updateNodeData(nodeId, { progress: pct })
  })

  useEffect(() => {
    void window.api.config.read().then((config) => {
      setImageModels(config.image_models)
      if (!modelId && config.settings.default_image_model) {
        setModelId(config.settings.default_image_model)
      }
    })
  }, [modelId])

  const selectedModel = imageModels.find((m) => m.id === modelId)
  const ui = getImageGeneratorUi(modelId, selectedModel?.model)
  const referenceEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'reference')
  const hasReferenceConnection = !!referenceEdge

  const handleGenerate = async () => {
    if (!modelId || !prompt || !currentProjectId) return
    updateNodeData(nodeId, { isGenerating: true, progress: 0, error: undefined })

    const [width, height] = RATIO_MAP[ratio] || [1024, 1024]
    const preset = STYLE_PRESETS.find((p) => p.id === styleId)
    const { prompt: compiled, negative: compiledNeg } = await compileForProject(currentProjectId, prompt)
    const styled = preset ? applyStyleToPrompt(compiled, preset) : compiled
    const finalPrompt = styled
    const finalNegative = [negativePrompt, compiledNeg, preset?.negativePrompt].filter(Boolean).join(', ')

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

      updateNodeData(nodeId, {
        imageSrc: src,
        ...(assetPath ? { imageAssetPath: assetPath } : {}),
        fileName,
        prompt,
        negativePrompt,
        modelId,
        ratio,
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
      handleError(err, 'imageGenerate')
      updateNodeData(nodeId, { isGenerating: false, error: String(err) })
    }
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 space-y-2">
        <div>
          <label className="text-[10px] text-text-muted">正向提示词</label>
          <ResizableTextarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要的画面..."
            minHeight={100}
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
        {hasReferenceConnection && (
          <div className="flex gap-2 items-center flex-wrap">
            <div
              className="w-16 h-16 rounded overflow-hidden border border-border"
              title="参考图"
            >
              <NodeImageThumb
                projectId={currentProjectId}
                nodeId={referenceEdge?.source}
                alt="参考图"
              />
            </div>
            {ui.supportsReferenceImage ? (
              <span className="text-[10px] text-text-muted">
                已接入参考图（最多 {ui.maxReferenceImages} 张）
              </span>
            ) : (
              <span className="text-[10px] text-amber-300">
                当前模型不支持参考图，请断开连线或更换模型
              </span>
            )}
          </div>
        )}
      </div>

      <div className="w-56 space-y-2">
        <div>
          <label className="text-[10px] text-text-muted">风格模板</label>
          <select
            value={styleId}
            onChange={(e) => setStyleId(e.target.value)}
            className="w-full bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none"
          >
            <option value="">无</option>
            {STYLE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {locale === 'en-US' ? p.nameEn : p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
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
        {FLUID_RESONANCE && (
          <button
            type="button"
            className="text-xs text-violet-400 hover:text-violet-300"
            onClick={() =>
              void window.api.negentropy.detect(currentProjectId!, prompt).then(setFakeItems)
            }
          >
            去掉假的
          </button>
        )}
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
              className="bg-cyan-500 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      {fakeItems && (
        <FakeElementChecklist
          items={fakeItems}
          onClose={() => setFakeItems(null)}
          onApply={(selected) => {
            const next = applyNegentropy(prompt, negativePrompt, selected)
            setPrompt(next.prompt)
            setNegativePrompt(next.negativePrompt)
            setFakeItems(null)
            void handleGenerate()
          }}
        />
      )}
    </div>
  )
}
