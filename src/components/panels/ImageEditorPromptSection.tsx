import type { Node } from '@xyflow/react'
import { ResizableTextarea } from '../common/ResizableTextarea'
import { sourceNodeLabel } from './imageEditorHelpers'

interface ImageEditorPromptSectionProps {
  prompt: string
  setPrompt: (v: string) => void
  negativePrompt: string
  setNegativePrompt: (v: string) => void
  negativeOpen: boolean
  onNegativeToggle: () => void
  isPromptSynced: boolean
  promptSourceNode?: Node
  promptEdge?: { id: string }
  onUnlinkPrompt: () => void
  isGenerating: boolean
  progress: number
  generateDisabled: boolean
  onGenerate: () => void
  onCancel: () => void
}

export function ImageEditorPromptSection({
  prompt,
  setPrompt,
  negativePrompt,
  setNegativePrompt,
  negativeOpen,
  onNegativeToggle,
  isPromptSynced,
  promptSourceNode,
  promptEdge,
  onUnlinkPrompt,
  isGenerating,
  progress,
  generateDisabled,
  onGenerate,
  onCancel,
}: ImageEditorPromptSectionProps) {
  return (
    <div className="shrink-0 border-t border-border pt-3 space-y-2">
      {isPromptSynced && promptSourceNode && (
        <div className="flex items-center justify-between gap-2 text-[10px] text-text-muted bg-bg-tertiary/40 rounded px-2 py-1.5">
          <span>
            🔗 来自{sourceNodeLabel(promptSourceNode.type)}节点
            {promptSourceNode.data?.title
              ? `「${String(promptSourceNode.data.title)}」`
              : ''}
          </span>
          {promptEdge && (
            <button
              type="button"
              onClick={onUnlinkPrompt}
              className="text-[var(--studio-accent)] hover:underline shrink-0"
            >
              解链编辑
            </button>
          )}
        </div>
      )}
      <div>
        <label className="text-[10px] text-text-muted">正向提示词</label>
        <ResizableTextarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要的画面..."
          minHeight={80}
        />
      </div>
      <div>
        <button
          type="button"
          onClick={onNegativeToggle}
          className="text-[10px] text-text-muted hover:text-text-secondary mb-1"
        >
          高级 {negativeOpen ? '▴' : '▾'}
        </button>
        {negativeOpen && (
          <input
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="低质量, 模糊, 变形..."
            className="w-full bg-bg-tertiary text-text-primary text-xs p-2 rounded outline-none"
          />
        )}
      </div>
      <div className="flex justify-end pt-1">
        <div className="flex items-center gap-2">
          {isGenerating && (
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-1 text-xs text-danger border border-danger/40 rounded hover:bg-danger/10"
            >
              取消
            </button>
          )}
          <button
            type="button"
            onClick={onGenerate}
            disabled={generateDisabled}
            className="px-4 py-1.5 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isGenerating ? `生成中 ${progress}%` : '生成'}
          </button>
        </div>
      </div>
    </div>
  )
}
