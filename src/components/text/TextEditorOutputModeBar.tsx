import type { TextOutputMode } from '../../types/node'

interface TextEditorOutputModeBarProps {
  nodeId: string
  outputMode: TextOutputMode
  draft: string
  output: string
  onModeChange: (mode: TextOutputMode) => void
  onSyncDraftToOutput: () => void
}

export function TextEditorOutputModeBar({
  nodeId,
  outputMode,
  draft,
  output,
  onModeChange,
  onSyncDraftToOutput,
}: TextEditorOutputModeBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      <span className="text-text-muted">输出模式</span>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="radio"
          name={`output-mode-${nodeId}`}
          checked={outputMode === 'passthrough'}
          onChange={() => onModeChange('passthrough')}
        />
        直接输出
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="radio"
          name={`output-mode-${nodeId}`}
          checked={outputMode === 'generated'}
          onChange={() => onModeChange('generated')}
        />
        使用 AI 结果
      </label>
      {outputMode === 'passthrough' && (
        <button
          type="button"
          onClick={onSyncDraftToOutput}
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
  )
}
