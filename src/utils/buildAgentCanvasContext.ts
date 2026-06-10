import type { Edge, Node } from '@xyflow/react'
import type { CanvasEdgeSnapshot, CanvasNodeSnapshot } from '../types/agent'

export function buildAgentCanvasContext(
  nodes: Node[],
  edges: Edge[],
  focusedNodeIds: string[],
): { canvasNodes: CanvasNodeSnapshot[]; canvasEdges: CanvasEdgeSnapshot[] } {
  const focusSet = new Set(focusedNodeIds)
  const relatedIds = new Set(focusedNodeIds)
  for (const edge of edges) {
    if (focusSet.has(edge.source) || focusSet.has(edge.target)) {
      relatedIds.add(edge.source)
      relatedIds.add(edge.target)
    }
  }

  const canvasNodes: CanvasNodeSnapshot[] = nodes
    .filter((n) => relatedIds.has(n.id))
    .map((n) => ({
      id: n.id,
      type: String(n.type ?? 'text'),
      label: (n.data?.label as string | undefined) ?? undefined,
      data: (n.data ?? {}) as Record<string, unknown>,
    }))

  const canvasEdges: CanvasEdgeSnapshot[] = edges
    .filter((e) => relatedIds.has(e.source) && relatedIds.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }))

  return { canvasNodes, canvasEdges }
}
