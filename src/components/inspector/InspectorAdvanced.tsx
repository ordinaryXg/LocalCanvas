import { useState, type ReactNode } from 'react'
import type { Node } from '@xyflow/react'
import { formatCanvasPosition, formatCanvasSize } from './inspectorUtils'
import { InspectorField } from './InspectorField'

interface Props {
  node: Node
  children?: ReactNode
}

export function InspectorAdvanced({ node, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] text-text-muted hover:text-text-secondary"
      >
        高级 {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-border/60 bg-bg-tertiary/20 p-2.5">
          <InspectorField label="画布尺寸" value={formatCanvasSize(node)} />
          <InspectorField label="位置" value={formatCanvasPosition(node)} />
          {children}
        </div>
      )}
    </div>
  )
}
