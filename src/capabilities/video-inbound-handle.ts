import type { Edge } from '@xyflow/react'
import { isTargetHandleAvailable } from '../utils/portCompat'
import { listVideoReferenceHandles } from '../utils/videoReferenceSlots'
import { getVideoNodePorts } from './node-port-ui'

/** 画布上视频节点统一入边端口 id */
export const VIDEO_UNIFIED_INPUT_HANDLE = 'in'

/**
 * 将连到统一入端口的连线解析为具体 targetHandle（prompt / firstFrame / …）
 */
export function resolveVideoInboundHandle(
  sourceType: string | undefined,
  sourceHandle: string | null | undefined,
  targetNodeId: string,
  modelId: string | undefined,
  edges: Edge[],
): string | null {
  if (sourceType === 'text' || sourceType === 'script') return 'prompt'
  if (sourceType === 'audio') return 'audio'
  if (sourceType === 'video' || sourceType === 'compose') return 'video'

  if (sourceType === 'image') {
    const allowed = new Set(getVideoNodePorts(modelId).map((p) => p.id))
    const candidates = [
      'firstFrame',
      'lastFrame',
      ...listVideoReferenceHandles(9),
    ].filter((id) => allowed.has(id))

    for (const handle of candidates) {
      if (isTargetHandleAvailable(edges, targetNodeId, handle)) {
        return handle
      }
    }
    return null
  }

  if (sourceHandle) return null
  return null
}

export function normalizeVideoConnection(
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
    targetType !== 'video' ||
    connection.targetHandle !== VIDEO_UNIFIED_INPUT_HANDLE
  ) {
    return connection
  }

  const resolved = resolveVideoInboundHandle(
    sourceType,
    connection.sourceHandle,
    connection.target,
    modelId,
    edges,
  )
  if (!resolved) return connection

  return { ...connection, targetHandle: resolved }
}
