interface TextEditorToolbarProps {
  hasOutput: boolean
  isGenerating: boolean
  canGenerate: boolean
  onCopyOutput: () => void
  onGenerate: () => void
  onCancel: () => void
}

export function TextEditorToolbar({
  hasOutput,
  isGenerating,
  canGenerate,
  onCopyOutput,
  onGenerate,
  onCancel,
}: TextEditorToolbarProps) {
  return (
    <div className="flex items-center justify-end gap-3 flex-wrap">
      <button
        type="button"
        onClick={onCopyOutput}
        disabled={!hasOutput}
        className="text-xs px-2 py-1 border border-border rounded text-text-muted hover:text-white disabled:opacity-40"
      >
        复制输出
      </button>
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating || !canGenerate}
        className="text-sm px-4 py-1.5 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
      >
        {isGenerating ? '生成中…' : '✨ 生成'}
      </button>
      {isGenerating && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-danger border border-danger/40 px-2 py-1 rounded"
        >
          取消
        </button>
      )}
    </div>
  )
}
