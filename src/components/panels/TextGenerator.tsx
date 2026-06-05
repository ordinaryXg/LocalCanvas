import { useState, useEffect } from 'react'
import type { LLMModelConfig } from '../../types/config'
import { useCanvasStore } from '../../stores/canvasStore'
import { handleError } from '../../utils/ErrorHandler'
import { useModelGeneration } from '../../hooks/useModelGeneration'
import { ResizableTextarea } from '../common/ResizableTextarea'

interface TextGeneratorProps {
  nodeId: string
}

export function TextGenerator({ nodeId }: TextGeneratorProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const nodes = useCanvasStore((s) => s.nodes)
  const node = nodes.find((n) => n.id === nodeId)
  const data = (node?.data ?? {}) as Record<string, unknown>

  const inputFromNode =
    (data.inputContent as string) ||
    (typeof data.content === 'string' && !data.generatedContent ? data.content : '') ||
    ''

  const [prompt, setPrompt] = useState(inputFromNode || (data.prompt as string) || '')
  const [systemPrompt, setSystemPrompt] = useState((data.systemPrompt as string) || '')
  const [modelId, setModelId] = useState((data.modelId as string) || '')
  const [llmModels, setLlmModels] = useState<LLMModelConfig[]>([])
  const { isGenerating, run, cancel } = useModelGeneration(nodeId)

  useEffect(() => {
    setPrompt(inputFromNode || (data.prompt as string) || '')
  }, [nodeId, inputFromNode, data.prompt])

  useEffect(() => {
    void window.api.config.read().then((config) => {
      setLlmModels(config.llm_models)
      if (!modelId && config.settings.default_llm) {
        setModelId(config.settings.default_llm)
      }
    })
  }, [modelId])

  const handlePromptChange = (value: string) => {
    setPrompt(value)
    updateNodeData(nodeId, { inputContent: value, prompt: value })
  }

  const handleGenerate = async () => {
    if (!modelId || !prompt) return

    try {
      const result = await run(() =>
        window.api.model.beginGenerateText({
          modelId,
          nodeId,
          prompt,
          systemPrompt: systemPrompt || undefined,
        }),
      )

      updateNodeData(nodeId, {
        generatedContent: result,
        content: result,
        prompt,
        inputContent: prompt,
        systemPrompt,
        modelId,
      })
    } catch (err) {
      handleError(err, 'textGenerate')
    }
  }

  const charCount = prompt.length
  const lineCount = prompt ? prompt.split('\n').length : 0

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 space-y-2 min-w-0">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-text-muted">输入内容</label>
            <span className="text-[10px] text-text-muted">
              {charCount.toLocaleString()} 字 · {lineCount} 行
            </span>
          </div>
          <ResizableTextarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="在此编辑长文本，将同步到节点「输入」栏…"
          />
        </div>
        <div>
          <label className="text-[10px] text-text-muted">系统提示（可选）</label>
          <input
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="设定 AI 角色或风格…"
            className="w-full bg-bg-tertiary text-text-primary text-xs p-2 rounded outline-none border border-transparent focus:border-border"
          />
        </div>
      </div>

      <div className="w-48 space-y-2 shrink-0">
        <div>
          <label className="text-[10px] text-text-muted">LLM 模型</label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full bg-bg-tertiary text-text-primary text-xs p-1.5 rounded outline-none"
          >
            <option value="">选择模型</option>
            {llmModels.map((m) => (
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
            disabled={isGenerating || !modelId || !prompt}
            className="flex-1 bg-accent text-white text-sm py-1.5 rounded hover:bg-accent-hover disabled:opacity-50 transition"
          >
            {isGenerating ? '生成中...' : '✨ 生成文本'}
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
      </div>
    </div>
  )
}
