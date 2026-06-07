import type { Edge, Node } from '@xyflow/react'
import { evaluateEdgeCompat } from './edge-compat'
import type { ModelKind } from '../types/capability'
import { edgeStyleForCompat } from '../utils/canvasEdge'
import { getNodeTypeFromId } from '../utils/portCompat'

function kindForNodeType(type?: string): ModelKind {
  if (type === 'image') return 'image'
  if (type === 'video') return 'video'
  return 'llm'
}

/** 打开项目或切换模型后，按当前能力目录重算连线实线/虚线 */
export function refreshEdgeCompatStyles(nodes: Node[], edges: Edge[]): Edge[] {
  return edges.map((edge) => {
    const sourceType = getNodeTypeFromId(nodes, edge.source)
    const targetNode = nodes.find((n) => n.id === edge.target)
    const targetType = targetNode?.type
    const result = evaluateEdgeCompat({
      sourceType,
      sourceHandle: edge.sourceHandle,
      targetType,
      targetHandle: edge.targetHandle,
      targetModelId: targetNode?.data?.modelId as string | undefined,
      targetKind: kindForNodeType(targetType),
      edges,
      targetNodeId: edge.target,
      excludeEdgeId: edge.id,
    })
    if (result.status === 'reject') return edge
    const status = result.status
    return {
      ...edge,
      animated: status === 'solid',
      style: edgeStyleForCompat(status),
      data: {
        ...(edge.data as Record<string, unknown> | undefined),
        compatStatus: status,
        compatReason: result.reason,
      },
    }
  })
}
