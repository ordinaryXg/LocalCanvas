import type { Edge, Node } from '@xyflow/react'
import { TYPE_LABELS } from '../components/inspector/constants'

export function isWarnEdge(edge: Edge): boolean {
  return (edge.data as { compatStatus?: string } | undefined)?.compatStatus === 'dashed_warn'
}

export function listWarnEdges(edges: Edge[]): Edge[] {
  return edges.filter(isWarnEdge)
}

export function edgeHealthLabel(edge: Edge, nodes: Node[]): string {
  const source = nodes.find((n) => n.id === edge.source)
  const target = nodes.find((n) => n.id === edge.target)
  const sourceLabel = TYPE_LABELS[source?.type ?? ''] ?? source?.type ?? edge.source
  const targetLabel = TYPE_LABELS[target?.type ?? ''] ?? target?.type ?? edge.target
  const reason = (edge.data as { compatReason?: string } | undefined)?.compatReason
  return `${sourceLabel} → ${targetLabel}${reason ? ` · ${reason}` : ''}`
}
