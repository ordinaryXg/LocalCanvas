import type { Node, Edge } from '@xyflow/react'
import { generateNodeId } from './id'

interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
  parentId?: string
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export function remapWorkflowToCanvas(
  workflowNodes: WorkflowNode[],
  workflowEdges: WorkflowEdge[],
  offset = { x: 100, y: 100 },
): { nodes: Node[]; edges: Edge[] } {
  const idMap = new Map<string, string>()

  for (const n of workflowNodes) {
    idMap.set(n.id, generateNodeId(n.type))
  }

  const nodes: Node[] = workflowNodes.map((n) => ({
    id: idMap.get(n.id)!,
    type: n.type,
    position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
    data: { ...n.data },
    parentId: n.parentId ? idMap.get(n.parentId) : undefined,
  }))

  const edges: Edge[] = workflowEdges.map((e) => ({
    id: generateNodeId('edge'),
    source: idMap.get(e.source)!,
    target: idMap.get(e.target)!,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: 'smoothstep',
    animated: true,
    style: { stroke: 'var(--color-accent, #6366f1)', strokeWidth: 2 },
  }))

  return { nodes, edges }
}
