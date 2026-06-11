import type { Edge } from '@xyflow/react'
import { getVideoGeneratorUi } from './generator-ui'
import { isTargetHandleAvailable } from '../utils/portCompat'
import {
  resolveVideoInputModes,
  VIDEO_IMAGE_INBOX_HANDLE,
  type VideoInputModes,
} from '../utils/videoInputLayout'

/** 画布上视频节点统一入边端口 id */
export const VIDEO_UNIFIED_INPUT_HANDLE = 'in'

export { VIDEO_IMAGE_INBOX_HANDLE }

/**
 * 将连到统一入端口的连线解析为具体 targetHandle（prompt / firstFrame / imageInbox / …）
 */
export function resolveVideoInboundHandle(
  sourceType: string | undefined,
  sourceHandle: string | null | undefined,
  targetNodeId: string,
  modelId: string | undefined,
  edges: Edge[],
  inputModes?: VideoInputModes,
  targetNodeData?: Record<string, unknown>,
): string | null {
  if (sourceType === 'text' || sourceType === 'script') return 'prompt'
  if (sourceType === 'audio') return 'audio'
  if (sourceType === 'video' || sourceType === 'compose') return 'video'

  if (sourceType === 'image') {
    const ui = getVideoGeneratorUi(modelId)
    const modes =
      inputModes ??
      resolveVideoInputModes(targetNodeData, edges, targetNodeId, ui)

    if (
      modes.firstLast &&
      ui.supportsFirstFrame &&
      isTargetHandleAvailable(edges, targetNodeId, 'firstFrame')
    ) {
      return 'firstFrame'
    }

    return VIDEO_IMAGE_INBOX_HANDLE
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
  targetNodeData?: Record<string, unknown>,
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
    undefined,
    targetNodeData,
  )
  if (!resolved) return connection

  return { ...connection, targetHandle: resolved }
}
