import type { Modality } from '../types/capability'
import { isLlmVisionImageHandle } from '../utils/llmVisionSlots'
import { isVideoReferenceImageHandle } from '../utils/videoReferenceSlots'

const SOURCE_MODALITY: Record<string, Modality | undefined> = {
  'text:prompt': 'text',
  'script:script': 'text',
  'image:image': 'image',
  'video:video': 'video',
  'compose:composed': 'video',
  'audio:audio': 'audio',
}

const TARGET_SLOT: Record<string, string | undefined> = {
  'image:prompt': 'prompt',
  'image:reference': 'reference_image',
  'video:prompt': 'prompt',
  'video:firstFrame': 'first_frame',
  'video:lastFrame': 'last_frame',
  'video:video': 'reference_video',
  'video:audio': 'reference_audio',
  'compose:audio': 'reference_audio',
  'text:image': 'image',
}

export function sourceKey(
  sourceType: string | undefined,
  sourceHandle: string | null | undefined,
): string | null {
  if (!sourceType || !sourceHandle) return null
  return `${sourceType}:${sourceHandle}`
}

export function targetKey(
  targetType: string | undefined,
  targetHandle: string | null | undefined,
): string | null {
  if (!targetType || !targetHandle) return null
  return `${targetType}:${targetHandle}`
}

export function sourceHandleToModality(
  sourceType: string | undefined,
  sourceHandle: string | null | undefined,
): Modality | null {
  const key = sourceKey(sourceType, sourceHandle)
  if (!key) return null
  return SOURCE_MODALITY[key] ?? null
}

export function targetHandleToSlotId(
  targetType: string | undefined,
  targetHandle: string | null | undefined,
): string | null {
  if (targetType === 'text' && isLlmVisionImageHandle(targetHandle)) {
    return 'image'
  }
  if (targetType === 'video' && isVideoReferenceImageHandle(targetHandle)) {
    return 'reference_image'
  }
  if (targetType === 'image' && isVideoReferenceImageHandle(targetHandle)) {
    return 'reference_image'
  }
  const key = targetKey(targetType, targetHandle)
  if (!key) return null
  return TARGET_SLOT[key] ?? null
}
