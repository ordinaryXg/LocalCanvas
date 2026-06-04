import { memo, useState } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { TextEditorModal } from '../common/TextEditorModal'
import { useCanvasStore } from '../../stores/canvasStore'
import { showToast } from '../../utils/ErrorHandler'

type TextTab = 'input' | 'output'
type EditorTarget = TextTab | null

function textStats(text: string): string {
  const chars = text.length
  if (chars === 0) return '空'
  if (chars < 1000) return `${chars} 字`
  return `${(chars / 1000).toFixed(1)}k 字`
}

function previewLines(text: string, maxLines = 4): string {
  const lines = text.split('\n')
  if (lines.length <= maxLines) return text
  return lines.slice(0, maxLines).join('\n') + '…'
}

function TextNodeComponent({ id, data: rawData, selected, width, height }: NodeProps) {
  const data = (rawData ?? {}) as Record<string, unknown>
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const [activeTab, setActiveTab] = useState<TextTab>('input')
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null)

  const inputContent =
    (data.inputContent as string) ||
    (typeof data.content === 'string' && !data.generatedContent ? data.content : '') ||
    ''
  const generatedContent =
    (data.generatedContent as string) ||
    (typeof data.content === 'string' ? data.content : '') ||
    ''

  const displayText = activeTab === 'input' ? inputContent : generatedContent
  const isEmpty = displayText.length === 0

  const copyText = async () => {
    if (!displayText) return
    try {
      await navigator.clipboard.writeText(displayText)
      showToast('已复制到剪贴板', 'info')
    } catch {
      showToast('复制失败', 'error')
    }
  }

  return (
    <>
      <BaseNode
        color="var(--node-text)"
        icon={<span className="text-sm">📝</span>}
        title="文本"
        selected={selected}
        width={width}
        height={height}
        defaultWidth={300}
        minWidth={260}
        minHeight={200}
        resizable
        outputs={[{ id: 'prompt', top: '50%' }]}
      >
        <div className="w-full flex flex-col flex-1 min-h-0 space-y-2">
          <div className="flex items-center gap-1 p-0.5 bg-bg-tertiary rounded-md">
            <button
              type="button"
              onClick={() => setActiveTab('input')}
              className={`flex-1 text-[10px] py-1 rounded transition nodrag ${
                activeTab === 'input'
                  ? 'bg-bg-secondary text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              输入
              {inputContent ? (
                <span className="ml-1 opacity-60">({textStats(inputContent)})</span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('output')}
              className={`flex-1 text-[10px] py-1 rounded transition nodrag ${
                activeTab === 'output'
                  ? 'bg-accent/20 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              生成
              {generatedContent ? (
                <span className="ml-1 opacity-60">({textStats(generatedContent)})</span>
              ) : null}
            </button>
          </div>

          <div
            className={`relative rounded-md border p-2 min-h-[88px] max-h-[120px] overflow-hidden nodrag ${
              activeTab === 'output'
                ? 'bg-accent/5 border-accent/25'
                : 'bg-bg-tertiary/40 border-border'
            }`}
            onDoubleClick={() => setEditorTarget(activeTab)}
          >
            {isEmpty ? (
              <p className="text-[11px] text-text-muted italic leading-relaxed">
                {activeTab === 'input'
                  ? '在此粘贴剧本、提示词等长文本，点击下方按钮进入全屏编辑'
                  : '选中节点后，在底部生成器生成文本'}
              </p>
            ) : (
              <pre className="text-[11px] text-text-primary whitespace-pre-wrap break-words leading-relaxed font-sans m-0">
                {previewLines(displayText)}
              </pre>
            )}
            {!isEmpty && displayText.split('\n').length > 4 && (
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-bg-secondary/90 to-transparent pointer-events-none" />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setEditorTarget(activeTab)}
              className="flex-1 text-[10px] py-1.5 bg-accent/15 text-accent rounded hover:bg-accent/25 nodrag"
            >
              {activeTab === 'input' ? '✏️ 编辑输入' : '✏️ 查看 / 编辑'}
            </button>
            <button
              type="button"
              onClick={() => void copyText()}
              disabled={isEmpty}
              className="px-2 py-1.5 text-[10px] bg-bg-tertiary text-text-muted rounded hover:text-white disabled:opacity-40 nodrag"
              title="复制"
            >
              📋
            </button>
          </div>

          {selected && activeTab === 'input' && (
            <p className="text-[9px] text-text-muted text-center shrink-0">
              选中时也可在底部「文本生成器」中编辑长文
            </p>
          )}

          <div className="flex-1 min-h-0" />
        </div>
      </BaseNode>

      {editorTarget === 'input' && (
        <TextEditorModal
          title="编辑输入内容"
          value={inputContent}
          placeholder="粘贴或输入长文本…"
          onClose={() => setEditorTarget(null)}
          onSave={(v) => updateNodeData(id, { inputContent: v })}
        />
      )}

      {editorTarget === 'output' && (
        <TextEditorModal
          title="生成内容"
          value={generatedContent}
          placeholder="暂无生成内容"
          onClose={() => setEditorTarget(null)}
          onSave={(v) => updateNodeData(id, { generatedContent: v, content: v })}
        />
      )}
    </>
  )
}

export const TextNode = memo(TextNodeComponent)
