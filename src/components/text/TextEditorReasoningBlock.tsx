interface TextEditorReasoningBlockProps {
  content: string
  open: boolean
  onToggle: () => void
}

export function TextEditorReasoningBlock({ content, open, onToggle }: TextEditorReasoningBlockProps) {
  if (!content.trim()) return null

  return (
    <div className="rounded-lg border border-border/60 bg-bg-tertiary/30">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-left text-xs text-text-muted hover:text-text-primary"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span>思考过程（reasoning）</span>
        <span>{open ? '收起' : '展开'}</span>
      </button>
      {open && (
        <pre className="px-3 pb-3 text-[11px] text-text-secondary whitespace-pre-wrap max-h-48 overflow-y-auto lc-scroll">
          {content}
        </pre>
      )}
    </div>
  )
}
