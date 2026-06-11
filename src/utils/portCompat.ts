import type { Edge } from '@xyflow/react'
import { isComposeVideoHandle } from './composeSequence'
import { listLlmVisionImageHandles } from './llmVisionSlots'
import { listVideoReferenceHandles } from './videoReferenceSlots'

const LEGACY_IMAGE_OUTPUT_HANDLES = new Set(['reference', 'firstFrame', 'lastFrame'])

const VIDEO_REFERENCE_TARGETS = listVideoReferenceHandles(9).map((h) => `video:${h}`)
const IMAGE_REFERENCE_TARGETS = [
  'image:reference',
  ...listVideoReferenceHandles(9).map((h) => `image:${h}`),
]
const TEXT_VISION_TARGETS = [
  'text:image',
  ...listLlmVisionImageHandles(20).map((h) => `text:${h}`),
]

const COMPAT_MAP: Record<string, string[]> = {
  'text:prompt': ['image:prompt', 'video:prompt'],
  'image:image': [
    ...IMAGE_REFERENCE_TARGETS,
    'video:firstFrame',
    'video:lastFrame',
    'video:imageInbox',
    ...VIDEO_REFERENCE_TARGETS,
    ...TEXT_VISION_TARGETS,
  ],
  'video:video': ['video:video'],
  'compose:composed': ['video:video'],
  'audio:audio': ['video:audio', 'compose:audio'],
  'script:script': ['image:prompt', 'video:prompt'],
}

/** 将旧版图片多输出口统一为 image */
export function normalizeImageSourceHandle(
  sourceType: string | undefined,
  sourceHandle: string | null | undefined,
): string | null | undefined {
  if (
    sourceType === 'image' &&
    sourceHandle &&
    LEGACY_IMAGE_OUTPUT_HANDLES.has(sourceHandle)
  ) {
    return 'image'
  }
  return sourceHandle
}

export function isPortCompatible(
  sourceType: string | undefined,
  sourceHandle: string | null | undefined,
  targetType: string | undefined,
  targetHandle: string | null | undefined,
): boolean {
  if (!sourceHandle || !targetHandle || !sourceType || !targetType) return false

  const normalizedSourceHandle = normalizeImageSourceHandle(sourceType, sourceHandle)

  if (
    sourceType === 'video' &&
    normalizedSourceHandle === 'video' &&
    targetType === 'compose' &&
    isComposeVideoHandle(targetHandle)
  ) {
    return true
  }

  const key = `${sourceType}:${normalizedSourceHandle}`
  const allowed = COMPAT_MAP[key]
  if (!allowed) return false
  return allowed.includes(`${targetType}:${targetHandle}`)
}

export function getNodeTypeFromId(
  nodes: Array<{ id: string; type?: string }>,
  nodeId: string,
): string | undefined {
  return nodes.find((n) => n.id === nodeId)?.type
}

/** 每个目标输入端口只允许一条入线（避免 dataFlow 多源冲突） */
const SINGLE_INPUT_HANDLES = new Set([
  'prompt',
  'reference',
  'firstFrame',
  'lastFrame',
  'audio',
  'video',
  ...listVideoReferenceHandles(9),
  'image',
  ...listLlmVisionImageHandles(20),
])

export function isTargetHandleAvailable(
  edges: Edge[],
  targetId: string,
  targetHandle: string | null | undefined,
): boolean {
  if (!targetHandle) return true
  if (!SINGLE_INPUT_HANDLES.has(targetHandle) && !isComposeVideoHandle(targetHandle)) {
    return true
  }
  return !edges.some((e) => e.target === targetId && e.targetHandle === targetHandle)
}

/** 源端口可扇出到多个不同目标；加载时迁移旧图片输出口 */
export function migrateImageOutputEdges(
  nodes: Array<{ id: string; type?: string }>,
  edges: Edge[],
): Edge[] {
  return edges.map((edge) => {
    const sourceType = getNodeTypeFromId(nodes, edge.source)
    const nextHandle = normalizeImageSourceHandle(sourceType, edge.sourceHandle)
    if (nextHandle !== edge.sourceHandle) {
      return { ...edge, sourceHandle: nextHandle }
    }
    return edge
  })
}
