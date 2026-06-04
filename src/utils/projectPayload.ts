import type { Node, Edge } from '@xyflow/react'
import type { ProjectGroup } from '../types/project'
import { stripTransientMediaFields } from './assetStorage'

export function extractGroupsFromNodes(nodes: Node[]): ProjectGroup[] {
  return nodes
    .filter((n) => n.type === 'group')
    .map((n) => ({
      id: n.id,
      label: (n.data?.label as string) || 'Group',
      position: { x: n.position.x, y: n.position.y },
      width: Number(n.style?.width) || 400,
      height: Number(n.style?.height) || 300,
    }))
}

export function serializeNodeForSave(node: Node): {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
  parentId?: string
  style?: Record<string, unknown>
  width?: number
  height?: number
} {
  return {
    id: node.id,
    type: node.type ?? 'text',
    position: node.position,
    data: stripTransientMediaFields(node.data as Record<string, unknown>),
    parentId: node.parentId,
    style: node.style as Record<string, unknown> | undefined,
    width: node.width,
    height: node.height,
  }
}

export function buildProjectSavePayload(params: {
  id: string
  name: string
  viewport: { x: number; y: number; zoom: number }
  nodes: Node[]
  edges: Edge[]
}): {
  id: string
  name: string
  viewport: { x: number; y: number; zoom: number }
  nodes: ReturnType<typeof serializeNodeForSave>[]
  edges: Edge[]
  groups: ProjectGroup[]
  updatedAt: string
} {
  return {
    id: params.id,
    name: params.name,
    viewport: params.viewport,
    nodes: params.nodes.map(serializeNodeForSave),
    edges: params.edges,
    groups: extractGroupsFromNodes(params.nodes),
    updatedAt: new Date().toISOString(),
  }
}
