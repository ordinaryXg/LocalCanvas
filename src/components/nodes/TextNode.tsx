import { memo, useState } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useCanvasStore } from '../../stores/canvasStore'

function TextNodeComponent({ id, data, selected, width, height }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const [isEditing, setIsEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const content = (data.content as string) || ''

  const displayText = content
  const isLong = displayText.length > 120
  const shownText = expanded || !isLong ? displayText : `${displayText.slice(0, 120)}...`

  return (
    <BaseNode
      color="var(--node-text)"
      icon={<span className="text-sm">📝</span>}
      title="文本"
      selected={selected}
      width={width}
      height={height}
      defaultWidth={240}
      minWidth={180}
      minHeight={80}
      outputs={[{ id: 'prompt', top: '50%' }]}
    >
      {isEditing ? (
        <textarea
          value={content}
          onChange={(e) => updateNodeData(id, { content: e.target.value })}
          onBlur={() => setIsEditing(false)}
          className="nodrag nowheel w-full h-24 bg-bg-tertiary text-white text-xs p-2 rounded resize-none outline-none border border-border focus:border-accent"
          autoFocus
        />
      ) : (
        <div
          onDoubleClick={() => setIsEditing(true)}
          className="min-h-[60px] text-xs text-text-primary cursor-text whitespace-pre-wrap break-words"
        >
          {displayText ? (
            <>
              {shownText}
              {isLong && (
                <button
                  type="button"
                  className="block mt-1 text-accent text-[10px] hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpanded(!expanded)
                  }}
                >
                  {expanded ? '收起' : '展开'}
                </button>
              )}
            </>
          ) : (
            <span className="text-text-muted italic">双击编辑文本...</span>
          )}
        </div>
      )}
    </BaseNode>
  )
}

export const TextNode = memo(TextNodeComponent)
