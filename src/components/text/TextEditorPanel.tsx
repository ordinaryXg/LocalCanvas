import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import type { LLMModelConfig } from '../../types/config'
import type { TextOutputMode } from '../../types/node'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { useTextEditorStore } from '../../stores/textEditorStore'
import { useTextNodeData } from '../../hooks/useTextNodeData'
import { handleError, showToast } from '../../utils/ErrorHandler'
import { useModelGeneration } from '../../hooks/useModelGeneration'
import { ResizableTextarea } from '../common/ResizableTextarea'
import { resolveProfile } from '../../capabilities/registry'
import { getLlmGeneratorUi } from '../../capabilities/generator-ui'
import { supportsThinkingUi } from '../../capabilities/reasoning-params'
import { assertNoWarnEdgesForNode, GenerationBlockedError } from '../../capabilities/generation-guard'
import type { ThinkingPreset } from '../../types/capability'
import { collectLlmVisionImagesFromEdges } from '../../utils/collectLlmVisionImages'
import {
  isLlmVisionImageHandle,
  visionImageIndexFromHandle,
} from '../../utils/llmVisionSlots'
import { NodeImageThumb } from '../common/NodeImageThumb'

interface TextEditorPanelProps {
  nodeId: string
}

const SPLIT_MIN = 0.22
const SPLIT_MAX = 0.78
const DEFAULT_SPLIT = 0.5

function countStats(text: string): string {
  const chars = text.length
  const lines = text ? text.split('\n').length : 0
  return `${chars.toLocaleString()} 字 · ${lines} 行`
}

export function TextEditorPanel({ nodeId }: TextEditorPanelProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const textData = useTextNodeData(nodeId)
  const focusDraftTick = useTextEditorStore((s) => s.focusDraftTick)
  const draftRef = useRef<HTMLTextAreaElement>(null)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const splitDragRef = useRef<{ startX: number; startRatio: number } | null>(null)

  const [systemPrompt, setSystemPrompt] = useState('')
  const [splitRatio, setSplitRatio] = useState(DEFAULT_SPLIT)
  const splitRatioRef = useRef(splitRatio)
  splitRatioRef.current = splitRatio
  const [modelId, setModelId] = useState('')
  const [thinkingPreset, setThinkingPreset] = useState<ThinkingPreset>('balanced')
  const [llmModels, setLlmModels] = useState<LLMModelConfig[]>([])
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const { isGenerating, run, cancel } = useModelGeneration(nodeId)

  useEffect(() => {
    if (!textData) return
    setSystemPrompt(textData.systemPrompt ?? '')
    setModelId(textData.modelId ?? '')
    setThinkingPreset(textData.thinkingPreset ?? 'balanced')
    const saved = textData.editorLayout?.splitRatio
    if (typeof saved === 'number') {
      setSplitRatio(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, saved)))
    }
  }, [nodeId, textData?.systemPrompt, textData?.modelId, textData?.thinkingPreset, textData?.editorLayout?.splitRatio])

  const activeProfile = modelId ? resolveProfile({ configId: modelId, kind: 'llm' }) : null
  const showThinking = activeProfile ? supportsThinkingUi(activeProfile) : false
  const llmUi = modelId ? getLlmGeneratorUi(modelId) : null
  const visionEdges = edges
    .filter(
      (e) =>
        e.target === nodeId &&
        e.targetHandle &&
        isLlmVisionImageHandle(e.targetHandle),
    )
    .sort(
      (a, b) =>
        visionImageIndexFromHandle(a.targetHandle!) -
        visionImageIndexFromHandle(b.targetHandle!),
    )

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!splitDragRef.current || !splitContainerRef.current) return
      const rect = splitContainerRef.current.getBoundingClientRect()
      const ratio = (event.clientX - rect.left) / rect.width
      const next = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, ratio))
      setSplitRatio(next)
    }

    const onMouseUp = () => {
      if (!splitDragRef.current) return
      splitDragRef.current = null
      const node = useCanvasStore.getState().nodes.find((n) => n.id === nodeId)
      const layout = (node?.data?.editorLayout as { splitRatio?: number } | undefined) ?? {}
      updateNodeData(nodeId, {
        editorLayout: { ...layout, splitRatio: splitRatioRef.current },
      })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [nodeId, updateNodeData])

  useEffect(() => {
    void window.api.config.read().then((config) => {
      setLlmModels(config.llm_models)
      if (!modelId && config.settings.default_llm) {
        setModelId(config.settings.default_llm)
      }
    })
  }, [modelId])

  useEffect(() => {
    draftRef.current?.focus()
  }, [focusDraftTick])

  if (!textData) return null

  const draft = textData.draft ?? ''
  const output = textData.output ?? ''
  const outputMode = textData.outputMode ?? 'passthrough'
  const patch = (data: Record<string, unknown>) => updateNodeData(nodeId, data)

  const handleDraftChange = (value: string) => {
    if (outputMode === 'passthrough' && !textData.outputEdited) {
      patch({ draft: value, output: value })
      return
    }
    patch({ draft: value })
  }

  const handleOutputChange = (value: string) => {
    patch({
      output: value,
      outputEdited: true,
    })
  }

  const handleModeChange = (mode: TextOutputMode) => {
    if (mode === 'passthrough' && !textData.outputEdited) {
      patch({ outputMode: mode, output: draft })
      return
    }
    patch({ outputMode: mode })
  }

  const syncDraftToOutput = () => {
    patch({ output: draft, outputMode: 'passthrough', outputEdited: false })
    showToast('已同步草稿到输出', 'info')
  }

  const copyOutput = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      showToast('已复制输出内容', 'info')
    } catch {
      showToast('复制失败', 'error')
    }
  }

  const startSplitDrag = (event: ReactMouseEvent) => {
    event.preventDefault()
    splitDragRef.current = { startX: event.clientX, startRatio: splitRatio }
  }

  const handleGenerate = async () => {
    if (!modelId || !draft.trim()) return
    try {
      assertNoWarnEdgesForNode(nodeId, nodes, edges, 'text_llm')
      const images = await collectLlmVisionImagesFromEdges(
        nodeId,
        nodes,
        edges,
        currentProjectId,
      )
      const result = await run(() =>
        window.api.model.beginGenerateText({
          modelId,
          nodeId,
          prompt: draft,
          systemPrompt: systemPrompt || undefined,
          thinkingPreset,
          ...(images.length > 0 ? { images } : {}),
        }),
      )
      patch({
        output: result,
        outputMode: 'generated',
        outputEdited: false,
        modelId,
        systemPrompt,
        thinkingPreset,
      })
    } catch (err) {
      if (err instanceof GenerationBlockedError) {
        showToast(err.message, 'error')
        return
      }
      handleError(err, 'textGenerate')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => void copyOutput()}
          disabled={!output}
          className="text-xs px-2 py-1 border border-border rounded text-text-muted hover:text-white disabled:opacity-40"
        >
          复制输出
        </button>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !modelId || !draft.trim()}
          className="text-sm px-4 py-1.5 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
        >
          {isGenerating ? '生成中…' : '✨ 生成'}
        </button>
        {isGenerating && (
          <button
            type="button"
            onClick={() => void cancel()}
            className="text-xs text-danger border border-danger/40 px-2 py-1 rounded"
          >
            取消
          </button>
        )}
      </div>

      <div
        ref={splitContainerRef}
        className="flex min-h-[200px] items-stretch"
      >
        <div
          className="min-w-0 flex flex-col shrink-0"
          style={{ width: `calc(${splitRatio * 100}% - 6px)` }}
        >
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-text-muted">草稿（LLM 输入源）</label>
            <span className="text-[10px] text-text-muted">{countStats(draft)}</span>
          </div>
          <ResizableTextarea
            ref={draftRef}
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            placeholder="输入剧本、提示词等长文本…"
            minHeight={160}
            maxHeight={360}
            className="flex-1 min-h-[160px]"
          />
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="调整草稿与输出宽度"
          title="拖动调整列宽"
          onMouseDown={startSplitDrag}
          className="group w-3 shrink-0 cursor-col-resize flex items-center justify-center hover:bg-accent/10 border-x border-border/40"
        >
          <span className="w-0.5 h-10 rounded-full bg-border group-hover:bg-accent/60 transition-colors" />
        </div>

        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-text-muted">输出（连线下游）</label>
            <span className="text-[10px] text-text-muted">{countStats(output)}</span>
          </div>
          <ResizableTextarea
            value={output}
            onChange={(e) => handleOutputChange(e.target.value)}
            placeholder={draft ? '可手改输出，或点击生成' : '同步草稿或生成后显示'}
            minHeight={160}
            maxHeight={360}
            className={`flex-1 min-h-[160px] ${outputMode === 'generated' ? 'border-accent/30 bg-accent/5' : ''}`}
          />
        </div>
      </div>

      {visionEdges.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-text-muted">
            Vision 图片 {visionEdges.length}
            {llmUi?.supportsVisionImage ? `/${llmUi.maxVisionImages}` : ''}
          </span>
          {visionEdges.map((edge) => (
            <div
              key={edge.id}
              className="w-10 h-10 rounded overflow-hidden border border-border"
              title={`图 ${visionImageIndexFromHandle(edge.targetHandle!) + 1}`}
            >
              <NodeImageThumb
                projectId={currentProjectId}
                nodeId={edge.source}
                alt="Vision"
              />
            </div>
          ))}
          {llmUi && !llmUi.supportsVisionImage && (
            <span className="text-[10px] text-amber-300">当前模型不支持图片输入</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="text-text-muted">输出模式</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name={`output-mode-${nodeId}`}
            checked={outputMode === 'passthrough'}
            onChange={() => handleModeChange('passthrough')}
          />
          直接输出
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name={`output-mode-${nodeId}`}
            checked={outputMode === 'generated'}
            onChange={() => handleModeChange('generated')}
          />
          使用 AI 结果
        </label>
        {outputMode === 'passthrough' && (
          <button
            type="button"
            onClick={syncDraftToOutput}
            disabled={!draft.trim()}
            className="text-accent hover:underline disabled:opacity-40 disabled:no-underline"
          >
            同步草稿 → 输出
          </button>
        )}
        {!output.trim() && draft.trim() && (
          <span className="text-amber-400/90 text-[10px]">输出为空，下游连线暂无内容</span>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="text-[10px] text-text-muted hover:text-white"
        >
          {advancedOpen ? '▼' : '▶'} 高级设置
        </button>
        {advancedOpen && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-text-muted">LLM 模型</label>
              <select
                value={modelId}
                onChange={(e) => {
                  setModelId(e.target.value)
                  patch({ modelId: e.target.value })
                }}
                className="w-full mt-1 bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none"
              >
                <option value="">选择模型</option>
                {llmModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            {showThinking && (
              <div>
                <label className="text-[10px] text-text-muted">思考强度</label>
                <select
                  value={thinkingPreset}
                  onChange={(e) => {
                    const value = e.target.value as ThinkingPreset
                    setThinkingPreset(value)
                    patch({ thinkingPreset: value })
                  }}
                  className="w-full mt-1 bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none"
                >
                  <option value="off">快速（低延迟）</option>
                  <option value="balanced">标准</option>
                  <option value="deep">深度推理</option>
                </select>
              </div>
            )}
            <div>
              <label className="text-[10px] text-text-muted">系统提示（可选）</label>
              <input
                value={systemPrompt}
                onChange={(e) => {
                  setSystemPrompt(e.target.value)
                  patch({ systemPrompt: e.target.value })
                }}
                placeholder="设定 AI 角色或风格…"
                className="w-full mt-1 bg-bg-tertiary text-text-primary text-xs p-2 rounded outline-none border border-transparent focus:border-border"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
