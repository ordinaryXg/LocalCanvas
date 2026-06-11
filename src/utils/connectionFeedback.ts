import type { Connection, Edge, Node } from '@xyflow/react'
import { evaluateEdgeCompat } from '../capabilities/edge-compat'
import {
  isUnifiedInboundUnresolved,
  normalizeInboundConnection,
} from '../capabilities/canvas-inbound-connection'
import type { ModelKind } from '../types/capability'
import { getNodeTypeFromId, isPortCompatible, isTargetHandleAvailable } from './portCompat'

export function describeConnectionReject(
  connection: Connection,
  nodes: Node[],
  edges: Edge[],
): string | null {
  const sourceType = getNodeTypeFromId(nodes, connection.source)
  const targetNode = nodes.find((n) => n.id === connection.target)
  const targetType = targetNode?.type ?? getNodeTypeFromId(nodes, connection.target)
  const normalized = normalizeInboundConnection(
    connection,
    sourceType,
    targetType,
    targetNode?.data?.modelId as string | undefined,
    edges,
    targetNode?.data as Record<string, unknown> | undefined,
  )
  if (isUnifiedInboundUnresolved(targetType, connection.targetHandle, normalized.targetHandle)) {
    return '请选择目标输入端口'
  }
  if (
    !isPortCompatible(
      sourceType,
      normalized.sourceHandle,
      targetType,
      normalized.targetHandle,
    )
  ) {
    return '端口类型不兼容'
  }
  const targetKind: ModelKind =
    targetType === 'image' ? 'image' : targetType === 'video' ? 'video' : 'llm'
  const compat = evaluateEdgeCompat({
    sourceType,
    sourceHandle: normalized.sourceHandle,
    targetType,
    targetHandle: normalized.targetHandle,
    targetModelId: targetNode?.data?.modelId as string | undefined,
    targetKind,
    edges,
    targetNodeId: normalized.target,
  })
  if (compat.status === 'reject') {
    return compat.reason ?? '该模型不接受此类型输入'
  }
  if (!isTargetHandleAvailable(edges, normalized.target, normalized.targetHandle)) {
    return '该输入端口已被占用'
  }
  return null
}
