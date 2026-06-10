import { ResizableTextarea } from '../common/ResizableTextarea'
import { textEditorCountStats } from './textEditorHelpers'
import type { TextOutputMode } from '../../types/node'

interface TextEditorSplitPaneProps {
  draftRef: React.RefObject<HTMLTextAreaElement | null>
  splitContainerRef: React.RefObject<HTMLDivElement | null>
  splitRatio: number
  onSplitDragStart: (event: React.MouseEvent) => void
  draft: string
  output: string
  outputMode: TextOutputMode
  onDraftChange: (value: string) => void
  onOutputChange: (value: string) => void
}

export function TextEditorSplitPane({
  draftRef,
  splitContainerRef,
  splitRatio,
  onSplitDragStart,
  draft,
  output,
  outputMode,
  onDraftChange,
  onOutputChange,
}: TextEditorSplitPaneProps) {
  return (
    <div ref={splitContainerRef} className="flex min-h-[200px] items-stretch">
      <div
        className="min-w-0 flex flex-col shrink-0"
        style={{ width: `calc(${splitRatio * 100}% - 6px)` }}
      >
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-text-muted">草稿（LLM 输入源）</label>
          <span className="text-[10px] text-text-muted">{textEditorCountStats(draft)}</span>
        </div>
        <ResizableTextarea
          ref={draftRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
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
        onMouseDown={onSplitDragStart}
        className="group w-3 shrink-0 cursor-col-resize flex items-center justify-center hover:bg-accent/10 border-x border-border/40"
      >
        <span className="w-0.5 h-10 rounded-full bg-border group-hover:bg-accent/60 transition-colors" />
      </div>

      <div className="min-w-0 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-text-muted">输出（连线下游）</label>
          <span className="text-[10px] text-text-muted">{textEditorCountStats(output)}</span>
        </div>
        <ResizableTextarea
          value={output}
          onChange={(e) => onOutputChange(e.target.value)}
          placeholder={draft ? '可手改输出，或点击生成' : '同步草稿或生成后显示'}
          minHeight={160}
          maxHeight={360}
          className={`flex-1 min-h-[160px] ${outputMode === 'generated' ? 'border-accent/30 bg-accent/5' : ''}`}
        />
      </div>
    </div>
  )
}
