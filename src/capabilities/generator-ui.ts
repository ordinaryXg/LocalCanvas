import {
  DEFAULT_SEEDANCE_VIDEO_MODEL,
  canonicalSeedanceApiModel,
  getSeedanceCapabilities,
} from '../constants/seedance'
import type { ModelCapabilityProfile } from '../types/capability'
import { isVideoReferenceImageHandle } from '../utils/videoReferenceSlots'
import { resolveProfileForConfig } from './profile-display'

export function profileHasInputSlot(profile: ModelCapabilityProfile, slotId: string): boolean {
  return profile.inputs.some((s) => s.id === slotId)
}

export function getInputSlotMax(profile: ModelCapabilityProfile, slotId: string): number {
  return profile.inputs.find((s) => s.id === slotId)?.max_count ?? 0
}

export interface VideoGeneratorUiConfig {
  profile: ModelCapabilityProfile
  supportsFirstFrame: boolean
  supportsLastFrame: boolean
  supportsReferenceImage: boolean
  maxReferenceImages: number
  supportsReferenceVideo: boolean
  supportsReferenceAudio: boolean
  supportsGenerateAudio: boolean
  versionLabel: string
  durations: readonly number[]
  resolutions: readonly string[]
}

function resolveSeedanceApiModel(configId: string, apiModel?: string): string {
  return canonicalSeedanceApiModel(configId, apiModel)
}

export function getVideoGeneratorUi(configId?: string, apiModel?: string): VideoGeneratorUiConfig {
  const resolvedId = configId?.trim() || DEFAULT_SEEDANCE_VIDEO_MODEL.id
  const profile = resolveProfileForConfig(resolvedId, apiModel, 'video')
  const isSeedance =
    profile.provider === 'volcengine_ark' || resolvedId.startsWith('seedance')
  const caps = getSeedanceCapabilities(
    isSeedance ? resolveSeedanceApiModel(resolvedId, apiModel) : (apiModel ?? ''),
  )

  return {
    profile,
    supportsFirstFrame: profileHasInputSlot(profile, 'first_frame'),
    supportsLastFrame: profileHasInputSlot(profile, 'last_frame'),
    supportsReferenceImage: profileHasInputSlot(profile, 'reference_image'),
    maxReferenceImages: getInputSlotMax(profile, 'reference_image'),
    supportsReferenceVideo: profileHasInputSlot(profile, 'reference_video'),
    supportsReferenceAudio: profileHasInputSlot(profile, 'reference_audio'),
    supportsGenerateAudio: isSeedance && caps.supportsGenerateAudio,
    versionLabel: isSeedance ? caps.version : '—',
    durations: isSeedance ? caps.durations : [5, 8, 10],
    resolutions: isSeedance ? caps.resolutions : ['720p', '1080p'],
  }
}

export interface LlmGeneratorUiConfig {
  profile: ModelCapabilityProfile
  supportsVisionImage: boolean
  maxVisionImages: number
}

export interface ImageGeneratorUiConfig {
  profile: ModelCapabilityProfile
  supportsReferenceImage: boolean
  maxReferenceImages: number
}

export function getLlmGeneratorUi(configId: string, apiModel?: string): LlmGeneratorUiConfig {
  const profile = resolveProfileForConfig(configId, apiModel, 'llm')
  const maxVisionImages = getInputSlotMax(profile, 'image')
  return {
    profile,
    supportsVisionImage: maxVisionImages > 0,
    maxVisionImages,
  }
}

export function getImageGeneratorUi(configId: string, apiModel?: string): ImageGeneratorUiConfig {
  const profile = resolveProfileForConfig(configId, apiModel, 'image')
  return {
    profile,
    supportsReferenceImage: profileHasInputSlot(profile, 'reference_image'),
    maxReferenceImages: getInputSlotMax(profile, 'reference_image'),
  }
}

/** 已连接但当前模型不支持的入边提示 */
export function listUnsupportedInboundSlots(
  ui: Pick<
    VideoGeneratorUiConfig,
    'supportsFirstFrame' | 'supportsLastFrame' | 'supportsReferenceImage' | 'supportsReferenceVideo' | 'supportsReferenceAudio'
  >,
  connectedHandles: string[],
): string[] {
  const messages: string[] = []
  const checks: Array<[boolean, string | ((h: string) => boolean), string]> = [
    [ui.supportsFirstFrame, 'firstFrame', '首帧'],
    [ui.supportsLastFrame, 'lastFrame', '尾帧'],
    [ui.supportsReferenceImage, (h) => isVideoReferenceImageHandle(h), '参考图'],
    [ui.supportsReferenceVideo, 'video', '参考视频'],
    [ui.supportsReferenceAudio, 'audio', '参考音频'],
  ]
  for (const [supported, handle, label] of checks) {
    const connected =
      typeof handle === 'function'
        ? connectedHandles.some(handle)
        : connectedHandles.includes(handle)
    if (!supported && connected) {
      messages.push(`当前模型不支持${label}输入，请断开连线或更换模型`)
    }
  }
  return messages
}
