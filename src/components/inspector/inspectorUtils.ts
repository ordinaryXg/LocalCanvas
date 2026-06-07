import type { Edge, Node } from '@xyflow/react'
import { nodeDisplayTitle } from '../../utils/nodeNaming'
import { isLlmVisionImageHandle } from '../../utils/llmVisionSlots'
import { TYPE_LABELS } from './constants'

export function findPromptSourceNode(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
): Node | undefined {
  const edge = edges.find((e) => e.target === nodeId && e.targetHandle === 'prompt')
  if (!edge) return undefined
  return nodes.find((n) => n.id === edge.source)
}

export function promptSourceLabel(source: Node | undefined): string | undefined {
  if (!source) return undefined
  const typeLabel = TYPE_LABELS[source.type ?? ''] ?? source.type ?? '上游'
  const title = nodeDisplayTitle(source, typeLabel)
  return `${typeLabel} · ${title}`
}

export function countVisionImageEdges(nodeId: string, edges: Edge[]): number {
  return edges.filter(
    (e) => e.target === nodeId && isLlmVisionImageHandle(e.targetHandle),
  ).length
}

export function formatCanvasSize(node: Node): string {
  return `${Math.round(node.width ?? 240)} × ${Math.round(node.height ?? 280)}`
}

export function formatCanvasPosition(node: Node): string {
  return `(${Math.round(node.position.x)}, ${Math.round(node.position.y)})`
}
