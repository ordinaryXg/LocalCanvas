import type { Node, Edge } from '@xyflow/react'
import { stripTransientMediaFields } from './assetStorage'

export function collectWorkflowNodeIds(nodes: Node[], rootIds: string[]): Set<string> {
  const ids = new Set<string>()

  const addWithChildren = (id: string) => {
    if (ids.has(id)) return
    ids.add(id)
    const node = nodes.find((n) => n.id === id)
    if (node?.type === 'group') {
      nodes.filter((n) => n.parentId === id).forEach((child) => addWithChildren(child.id))
    }
  }

  for (const id of rootIds) {
    addWithChildren(id)
  }

  return ids
}

export interface WorkflowSnapshot {
  version: 1
  name: string
  createdAt: string
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: Record<string, unknown>
    parentId?: string
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string | null
    targetHandle?: string | null
  }>
}

export function extractWorkflowSnapshot(
  nodes: Node[],
  edges: Edge[],
  rootIds: string[],
  name?: string,
): WorkflowSnapshot {
  const idSet = collectWorkflowNodeIds(nodes, rootIds)
  const subNodes = nodes.filter((n) => idSet.has(n.id))
  const subEdges = edges.filter((e) => idSet.has(e.source) && idSet.has(e.target))

  return {
    version: 1,
    name: name ?? `workflow-${Date.now()}`,
    createdAt: new Date().toISOString(),
    nodes: subNodes.map((n) => ({
      id: n.id,
      type: n.type ?? 'text',
      position: n.position,
      data: stripTransientMediaFields(n.data as Record<string, unknown>),
      parentId: n.parentId,
    })),
    edges: subEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  }
}
