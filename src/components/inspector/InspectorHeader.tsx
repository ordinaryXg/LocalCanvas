import { useEffect, useState } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { NODE_TYPE_COLORS } from './constants'

interface Props {
  nodeId: string
  type: string
  title?: string
  fallback: string
}

export function InspectorHeader({ nodeId, type, title, fallback }: Props) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const [draft, setDraft] = useState(title?.trim() || fallback)
  const [idOpen, setIdOpen] = useState(false)

  useEffect(() => {
    setDraft(title?.trim() || fallback)
  }, [title, fallback])

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ background: NODE_TYPE_COLORS[type] ?? 'var(--color-accent)' }}
        />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const next = draft.trim()
            if (next && next !== (title?.trim() || fallback)) {
              updateNodeData(nodeId, { title: next })
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          className="flex-1 min-w-0 text-sm font-medium text-text-primary bg-bg-tertiary/60 border border-border rounded px-2 py-1 outline-none focus:border-[var(--studio-accent)]"
          aria-label="节点名称"
        />
      </div>
      <button
        type="button"
        onClick={() => setIdOpen((v) => !v)}
        className="text-[10px] text-text-muted font-mono truncate w-full text-left hover:text-text-secondary"
        title={nodeId}
      >
        {idOpen ? nodeId : `${nodeId.slice(0, 12)}…`}
      </button>
    </div>
  )
}
