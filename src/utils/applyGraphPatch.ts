import type { Edge, Node } from '@xyflow/react'
import type { GraphPatch } from '../types/agent'
import { createCanvasEdge } from './canvasEdge'
import { generateNodeId } from './id'

const COL_OFFSET_X = 400

export interface ApplyGraphPatchInput {
  patch: GraphPatch
  nodes: Node[]
  edges: Edge[]
}

export interface ApplyGraphPatchResult {
  nodesToAdd: Node[]
  edgesToAdd: Edge[]
  nodeIdsToRemove: string[]
  edgeIdsToRemove: string[]
  dataUpdates: Array<{ nodeId: string; data: Record<string, unknown> }>
  error?: string
}

export function applyGraphPatch({
  patch,
  nodes,
  edges,
}: ApplyGraphPatchInput): ApplyGraphPatchResult {
  const existingIds = new Set(nodes.map((n) => n.id))
  const existingEdgeIds = new Set(edges.map((e) => e.id))

  for (const anchorId of patch.anchorNodeIds) {
    if (!existingIds.has(anchorId)) {
      return {
        nodesToAdd: [],
        edgesToAdd: [],
        nodeIdsToRemove: [],
        edgeIdsToRemove: [],
        dataUpdates: [],
        error: `锚定节点 ${anchorId} 已不存在，请重新选中后重试`,
      }
    }
  }

  const idMap = new Map<string, string>()
  for (const anchorId of patch.anchorNodeIds) {
    idMap.set(anchorId, anchorId)
  }

  const anchorNodes = nodes.filter((n) => patch.anchorNodeIds.includes(n.id))
  const baseX =
    anchorNodes.length > 0
      ? Math.max(...anchorNodes.map((n) => n.position.x + (n.measured?.width ?? 200)))
      : 120
  const baseY =
    anchorNodes.length > 0
      ? anchorNodes.reduce((sum, n) => sum + n.position.y, 0) / anchorNodes.length
      : 120

  const nodesToAdd: Node[] = []
  for (const [index, planned] of (patch.addNodes ?? []).entries()) {
    const realId = generateNodeId(planned.type)
    idMap.set(planned.tempId, realId)
    const position = planned.position ?? {
      x: baseX + COL_OFFSET_X,
      y: baseY + index * 220,
    }
    nodesToAdd.push({
      id: realId,
      type: planned.type,
      position,
      data: {
        ...planned.data,
        ...(planned.label ? { label: planned.label } : {}),
        ...(typeof planned.data.modelId === 'string' && planned.data.modelId
          ? { modelId: planned.data.modelId }
          : planned.modelHint
            ? { modelId: planned.modelHint }
            : {}),
      },
    })
  }

  const resolveEndpoint = (ref: string): string | null => {
    if (idMap.has(ref)) return idMap.get(ref)!
    if (existingIds.has(ref)) return ref
    return null
  }

  const edgesToAdd: Edge[] = []
  for (const planned of patch.addEdges ?? []) {
    const source = resolveEndpoint(planned.source)
    const target = resolveEndpoint(planned.target)
    if (!source || !target) continue
    edgesToAdd.push(
      createCanvasEdge({
        id: generateNodeId('edge'),
        source,
        target,
        sourceHandle: planned.sourceHandle,
        targetHandle: planned.targetHandle,
      }),
    )
  }

  const nodeIdsToRemove = (patch.removeNodeIds ?? []).filter((id) => existingIds.has(id))
  const edgeIdsToRemove = (patch.removeEdgeIds ?? []).filter((id) => existingEdgeIds.has(id))

  const dataUpdates: Array<{ nodeId: string; data: Record<string, unknown> }> = []
  for (const update of patch.updateNodes ?? []) {
    if (!existingIds.has(update.nodeId)) continue
    dataUpdates.push({ nodeId: update.nodeId, data: update.data })
  }

  return {
    nodesToAdd,
    edgesToAdd,
    nodeIdsToRemove,
    edgeIdsToRemove,
    dataUpdates,
  }
}
