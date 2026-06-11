import type { Edge } from '@xyflow/react'
import type { VideoGeneratorUiConfig } from '../capabilities/generator-ui'
import {
  isVideoReferenceImageHandle,
  listVideoReferenceHandles,
  videoReferenceHandleFromIndex,
} from './videoReferenceSlots'

/** 未分配角色的图片入边（可多条） */
export const VIDEO_IMAGE_INBOX_HANDLE = 'imageInbox'

export interface VideoInputModes {
  firstLast: boolean
  reference: boolean
}

export type VideoImageInputGroup = {
  inbox: Edge[]
  firstFrame: Edge | undefined
  lastFrame: Edge | undefined
  references: Edge[]
}

const SINGLE_IMAGE_HANDLES = new Set([
  'firstFrame',
  'lastFrame',
  ...listVideoReferenceHandles(9),
])

export function resolveVideoInputModes(
  data: Record<string, unknown> | undefined,
  edges: Edge[],
  nodeId: string,
  ui: Pick<
    VideoGeneratorUiConfig,
    'supportsFirstFrame' | 'supportsLastFrame' | 'supportsReferenceImage'
  >,
): VideoInputModes {
  const stored = data?.inputModes as Partial<VideoInputModes> | undefined
  const hasFrameEdge = edges.some(
    (e) =>
      e.target === nodeId &&
      (e.targetHandle === 'firstFrame' || e.targetHandle === 'lastFrame'),
  )
  const hasReferenceEdge = edges.some(
    (e) => e.target === nodeId && isVideoReferenceImageHandle(e.targetHandle),
  )

  return {
    firstLast:
      stored?.firstLast ??
      (hasFrameEdge || ui.supportsFirstFrame || ui.supportsLastFrame),
    reference: stored?.reference ?? (hasReferenceEdge || false),
  }
}

export function listVideoImageInputs(nodeId: string, edges: Edge[]): VideoImageInputGroup {
  const inbound = edges.filter((e) => e.target === nodeId)
  return {
    inbox: inbound.filter((e) => e.targetHandle === VIDEO_IMAGE_INBOX_HANDLE),
    firstFrame: inbound.find((e) => e.targetHandle === 'firstFrame'),
    lastFrame: inbound.find((e) => e.targetHandle === 'lastFrame'),
    references: inbound
      .filter((e) => isVideoReferenceImageHandle(e.targetHandle))
      .sort(
        (a, b) =>
          parseInt(a.targetHandle!.replace('reference', ''), 10) -
          parseInt(b.targetHandle!.replace('reference', ''), 10),
      ),
  }
}

export function findFirstAvailableReferenceHandle(
  edges: Edge[],
  targetNodeId: string,
  maxReferenceImages: number,
): string | null {
  for (let i = 0; i < maxReferenceImages; i++) {
    const handle = videoReferenceHandleFromIndex(i)
    if (!edges.some((e) => e.target === targetNodeId && e.targetHandle === handle)) {
      return handle
    }
  }
  return null
}

/** 拖拽分配 / 模式切换时更新入边 targetHandle */
export function reassignVideoImageRole(
  edges: Edge[],
  edgeId: string,
  newHandle: string,
  targetNodeId: string,
): Edge[] {
  const edge = edges.find((e) => e.id === edgeId)
  if (!edge || edge.target !== targetNodeId) return edges

  const previousHandle = edge.targetHandle ?? VIDEO_IMAGE_INBOX_HANDLE

  if (SINGLE_IMAGE_HANDLES.has(newHandle)) {
    const occupant = edges.find(
      (e) => e.target === targetNodeId && e.targetHandle === newHandle && e.id !== edgeId,
    )
    if (occupant) {
      return edges.map((e) => {
        if (e.id === edgeId) return { ...e, targetHandle: newHandle }
        if (e.id === occupant.id) return { ...e, targetHandle: previousHandle }
        return e
      })
    }
  }

  return edges.map((e) => (e.id === edgeId ? { ...e, targetHandle: newHandle } : e))
}

export function countUnassignedVideoImages(nodeId: string, edges: Edge[]): number {
  return listVideoImageInputs(nodeId, edges).inbox.length
}
