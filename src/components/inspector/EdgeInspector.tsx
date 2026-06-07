import type { Edge, Node } from '@xyflow/react'
import { useCanvasStore } from '../../stores/canvasStore'
import {
  evaluateEdgeCompat,
} from '../../capabilities/edge-compat'
import type { ModelKind } from '../../types/capability'
import { getPortHint } from '../nodes/portMeta'
import { TYPE_LABELS } from './constants'
import { InspectorField } from './InspectorField'
import { InspectorSection } from './InspectorSection'

interface Props {
  edge: Edge
  nodes: Node[]
}

export function EdgeInspector({ edge, nodes }: Props) {
  const removeEdge = useCanvasStore((s) => s.removeEdge)
  const allEdges = useCanvasStore((s) => s.edges)
  const source = nodes.find((n) => n.id === edge.source)
  const target = nodes.find((n) => n.id === edge.target)
  const targetData = target?.data as Record<string, unknown> | undefined
  const compat = evaluateEdgeCompat({
    sourceType: source?.type,
    sourceHandle: edge.sourceHandle,
    targetType: target?.type,
    targetHandle: edge.targetHandle,
    targetModelId: targetData?.modelId as string | undefined,
    targetKind: target?.type as ModelKind | undefined,
    edges: allEdges,
    targetNodeId: target?.id,
  })

  const sourceHint = edge.sourceHandle ? getPortHint(edge.sourceHandle, 'source') : undefined
  const targetHint = edge.targetHandle ? getPortHint(edge.targetHandle, 'target') : undefined

  return (
    <div className="space-y-4">
      <InspectorSection title="连线">
        <div className="space-y-1.5 rounded-lg border border-border/60 bg-bg-tertiary/20 p-2.5 text-xs">
          <InspectorField
            label="源"
            value={`${TYPE_LABELS[source?.type ?? ''] ?? source?.type} · ${sourceHint ?? edge.sourceHandle ?? '—'}`}
          />
          <InspectorField
            label="目标"
            value={`${TYPE_LABELS[target?.type ?? ''] ?? target?.type} · ${targetHint ?? edge.targetHandle ?? '—'}`}
          />
          <InspectorField
            label="状态"
            value={
              compat.status === 'solid'
                ? '已验证'
                : compat.status === 'dashed_warn'
                  ? '未验证'
                  : '不兼容'
            }
          />
        </div>
      </InspectorSection>
      {compat.status === 'reject' && (
        <p className="text-xs text-amber-400/90 border border-amber-500/30 rounded-lg px-2 py-1.5">
          {compat.reason ?? '能力不匹配'}
        </p>
      )}
      {compat.status === 'dashed_warn' && compat.reason && (
        <p className="text-xs text-amber-300/90 border border-amber-500/20 rounded-lg px-2 py-1.5">
          {compat.reason}
        </p>
      )}
      <button
        type="button"
        onClick={() => removeEdge(edge.id)}
        className="text-xs text-danger hover:underline"
      >
        断开连线
      </button>
    </div>
  )
}
