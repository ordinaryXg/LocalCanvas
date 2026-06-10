import type { Edge } from '@xyflow/react'
import { isTargetHandleAvailable } from '../utils/portCompat'
import { isVideoReferenceImageHandle } from '../utils/videoReferenceSlots'
import { getImageNodePorts } from './node-port-ui'

/** 画布上图片节点统一入边端口 id */
export const IMAGE_UNIFIED_INPUT_HANDLE = 'in'

export function resolveImageInboundHandle(
  sourceType: string | undefined,
  _sourceHandle: string | null | undefined,
  targetNodeId: string,
  modelId: string | undefined,
  edges: Edge[],
): string | null {
  if (sourceType === 'text' || sourceType === 'script') return 'prompt'

  if (sourceType === 'image') {
    const portIds = getImageNodePorts(modelId).map((p) => p.id)
    const refHandles = portIds.filter(
      (id) => id === 'reference' || isVideoReferenceImageHandle(id),
    )
    for (const handle of refHandles) {
      if (isTargetHandleAvailable(edges, targetNodeId, handle)) {
        return handle
      }
    }
    return null
  }

  return null
}

export function normalizeImageConnection(
  connection: {
    source: string
    target: string
    sourceHandle?: string | null
    targetHandle?: string | null
  },
  sourceType: string | undefined,
  targetType: string | undefined,
  modelId: string | undefined,
  edges: Edge[],
): typeof connection {
  if (
    targetType !== 'image' ||
    connection.targetHandle !== IMAGE_UNIFIED_INPUT_HANDLE
  ) {
    return connection
  }

  const resolved = resolveImageInboundHandle(
    sourceType,
    connection.sourceHandle,
    connection.target,
    modelId,
    edges,
  )
  if (!resolved) return connection

  return { ...connection, targetHandle: resolved }
}
