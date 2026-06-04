import { useState, useEffect } from 'react'
import type { LLMModelConfig } from '../../types/config'
import { useCanvasStore } from '../../stores/canvasStore'
import { handleError } from '../../utils/ErrorHandler'

interface TextGeneratorProps {
  nodeId: string
}

export function TextGenerator({ nodeId }: TextGeneratorProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const nodes = useCanvasStore((s) => s.nodes)
  const node = nodes.find((n) => n.id === nodeId)
  const data = (node?.data ?? {}) as Record<string, unknown>

  const [prompt, setPrompt] = useState((data.prompt as string) || '')
  const [systemPrompt, setSystemPrompt] = useState((data.systemPrompt as string) || '')
  const [modelId, setModelId] = useState((data.modelId as string) || '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [llmModels, setLlmModels] = useState<LLMModelConfig[]>([])

  useEffect(() => {
    void window.api.config.read().then((config) => {
      setLlmModels(config.llm_models)
      if (!modelId && config.settings.default_llm) {
        setModelId(config.settings.default_llm)
      }
    })
  }, [modelId])

  const handleGenerate = async () => {
    if (!modelId || !prompt) return
    setIsGenerating(true)

    try {
      const result = await window.api.model.generateText({
        modelId,
        nodeId,
        prompt,
        systemPrompt: systemPrompt || undefined,
      })

      updateNodeData(nodeId, {
        content: result,
        prompt,
        systemPrompt,
        modelId,
      })
    } catch (err) {
      handleError(err, 'textGenerate')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 space-y-2">
        <div>
          <label className="text-[10px] text-text-muted">提示词</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="输入要生成的文本内容..."
            className="w-full h-16 bg-bg-tertiary text-text-primary text-xs p-2 rounded resize-none outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-text-muted">系统提示（可选）</label>
          <input
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="设定 AI 角色或风格..."
            className="w-full bg-bg-tertiary text-text-primary text-xs p-2 rounded outline-none"
          />
        </div>
      </div>

      <div className="w-48 space-y-2">
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
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !modelId || !prompt}
          className="w-full bg-accent text-white text-sm py-1.5 rounded hover:bg-accent-hover disabled:opacity-50 transition"
        >
          {isGenerating ? '生成中...' : '✨ 生成文本'}
        </button>
      </div>
    </div>
  )
}
