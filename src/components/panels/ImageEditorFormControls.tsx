import type { RefObject } from 'react'
import { ModelCapabilityBadges } from './ModelCapabilityBadges'
import { NodeImageThumb } from '../common/NodeImageThumb'
import { StylePresetChips, type StylePresetChipsHandle } from './StylePresetChips'
import type { ImageModelConfig } from '../../types/config'
import type { ImageGeneratorUiConfig } from '../../capabilities/generator-ui'

interface ImageEditorFormControlsProps {
  nodeId: string
  previewHeight: number
  hidePreview: boolean
  warningsRef: RefObject<HTMLDivElement | null>
  styleChipsRef: RefObject<StylePresetChipsHandle | null>
  modelId: string
  setModelId: (id: string) => void
  imageModels: ImageModelConfig[]
  ui: ImageGeneratorUiConfig
  ratio: string
  setRatio: (r: string) => void
  batchSize: number
  setBatchSize: (n: number) => void
  styleId: string
  prompt: string
  negativePrompt: string
  onStyleChange: (id: string) => void
  recommendedModelId?: string
  onApplyRecommendedModel: (id: string) => void
  referenceEdges?: Array<{ id: string; source: string }>
  currentProjectId: string | null
  warnings: string[]
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void
}

export function ImageEditorFormControls({
  nodeId,
  previewHeight,
  hidePreview,
  warningsRef,
  styleChipsRef,
  modelId,
  setModelId,
  imageModels,
  ui,
  ratio,
  setRatio,
  batchSize,
  setBatchSize,
  styleId,
  prompt,
  negativePrompt,
  onStyleChange,
  recommendedModelId,
  onApplyRecommendedModel,
  referenceEdges,
  currentProjectId,
  warnings,
  updateNodeData,
}: ImageEditorFormControlsProps) {
  return (
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
            onChange={(e) => {
              const next = e.target.value
              setRatio(next)
              updateNodeData(nodeId, { ratio: next })
            }}
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
            onChange={(e) => {
              const next = parseInt(e.target.value, 10)
              setBatchSize(next)
              updateNodeData(nodeId, { batchSize: next })
            }}
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
        onStyleChange={onStyleChange}
        recommendedModelId={recommendedModelId}
        recommendedModelName={
          recommendedModelId
            ? imageModels.find((m) => m.id === recommendedModelId)?.name
            : undefined
        }
        currentModelId={modelId}
        onApplyRecommendedModel={onApplyRecommendedModel}
      />

      <div>
        <label className="text-[10px] text-text-muted">参考图</label>
        {referenceEdges && referenceEdges.length > 0 ? (
          <div className="mt-1 space-y-1">
            <div className="flex flex-wrap gap-2">
              {referenceEdges.map((edge) => (
                <div
                  key={edge.id}
                  className="w-14 h-14 rounded overflow-hidden border border-border shrink-0"
                >
                  <NodeImageThumb
                    projectId={currentProjectId}
                    nodeId={edge.source}
                    alt="参考图"
                  />
                </div>
              ))}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-text-secondary">
                已连接 {referenceEdges.length} 张参考图
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
          <p className="text-[10px] text-text-muted mt-1 italic">从画布连接图片节点作为参考图</p>
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
  )
}
