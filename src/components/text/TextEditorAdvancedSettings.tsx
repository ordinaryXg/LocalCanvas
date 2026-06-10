import type { LLMModelConfig } from '../../types/config'
import type { ThinkingPreset } from '../../types/capability'

interface TextEditorAdvancedSettingsProps {
  open: boolean
  onToggle: () => void
  modelId: string
  llmModels: LLMModelConfig[]
  showThinking: boolean
  thinkingPreset: ThinkingPreset
  systemPrompt: string
  onModelChange: (id: string) => void
  onThinkingChange: (preset: ThinkingPreset) => void
  onSystemPromptChange: (value: string) => void
}

export function TextEditorAdvancedSettings({
  open,
  onToggle,
  modelId,
  llmModels,
  showThinking,
  thinkingPreset,
  systemPrompt,
  onModelChange,
  onThinkingChange,
  onSystemPromptChange,
}: TextEditorAdvancedSettingsProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="text-[10px] text-text-muted hover:text-white"
      >
        {open ? '▼' : '▶'} 高级设置
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-text-muted">LLM 模型</label>
            <select
              value={modelId}
              onChange={(e) => onModelChange(e.target.value)}
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
                onChange={(e) => onThinkingChange(e.target.value as ThinkingPreset)}
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
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder="设定 AI 角色或风格…"
              className="w-full mt-1 bg-bg-tertiary text-text-primary text-xs p-2 rounded outline-none border border-transparent focus:border-border"
            />
          </div>
        </div>
      )}
    </div>
  )
}
