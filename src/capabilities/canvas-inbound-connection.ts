import type { Edge } from '@xyflow/react'
import {
  IMAGE_UNIFIED_INPUT_HANDLE,
  normalizeImageConnection,
} from './image-inbound-handle'
import {
  normalizeVideoConnection,
  VIDEO_UNIFIED_INPUT_HANDLE,
} from './video-inbound-handle'

export function normalizeInboundConnection(
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
  let normalized = normalizeVideoConnection(
    connection,
    sourceType,
    targetType,
    modelId,
    edges,
  )
  normalized = normalizeImageConnection(
    normalized,
    sourceType,
    targetType,
    modelId,
    edges,
  )
  return normalized
}

export function isUnifiedInboundUnresolved(
  targetType: string | undefined,
  originalHandle: string | null | undefined,
  normalizedHandle: string | null | undefined,
): boolean {
  if (!originalHandle || originalHandle !== normalizedHandle) return false
  if (targetType === 'video' && originalHandle === VIDEO_UNIFIED_INPUT_HANDLE) return true
  if (targetType === 'image' && originalHandle === IMAGE_UNIFIED_INPUT_HANDLE) return true
  return false
}

export { IMAGE_UNIFIED_INPUT_HANDLE, VIDEO_UNIFIED_INPUT_HANDLE }
