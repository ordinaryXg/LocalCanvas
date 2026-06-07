import { useMemo } from 'react'
import type { Edge, Node } from '@xyflow/react'
import { useCanvasStore } from '../../stores/canvasStore'
import { generateNodeId } from '../../utils/id'
import { TYPE_LABELS } from './constants'
import { InspectorField } from './InspectorField'
import { InspectorSection } from './InspectorSection'

interface Props {
  nodes: Node[]
  edges: Edge[]
}

export function ProjectSummary({ nodes, edges }: Props) {
  const addNode = useCanvasStore((s) => s.addNode)

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const n of nodes) {
      const t = n.type ?? 'unknown'
      counts[t] = (counts[t] ?? 0) + 1
    }
    return counts
  }, [nodes])

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-text-primary">项目摘要</h3>
      <div className="space-y-1.5 rounded-lg border border-border/60 bg-bg-tertiary/20 p-2.5 text-xs">
        <InspectorField label="节点" value={nodes.length} />
        <InspectorField label="连线" value={edges.length} />
      </div>
      {Object.keys(typeCounts).length > 0 && (
        <InspectorSection title="节点分布">
          <div className="space-y-1">
            {Object.entries(typeCounts).map(([t, count]) => (
              <InspectorField key={t} label={TYPE_LABELS[t] ?? t} value={count} />
            ))}
          </div>
        </InspectorSection>
      )}
      <button
        type="button"
        onClick={() =>
          addNode({
            id: generateNodeId('text'),
            type: 'text',
            position: { x: 160, y: 160 },
            data: { title: '文本', draft: '', output: '', outputMode: 'passthrough' },
            selected: true,
          })
        }
        className="w-full py-2 rounded-lg border border-[var(--studio-border)] text-xs hover:bg-[var(--studio-surface-hover)]"
      >
        + 新建文本节点
      </button>
    </div>
  )
}
