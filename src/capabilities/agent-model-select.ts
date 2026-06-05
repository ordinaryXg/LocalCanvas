import type { AppConfig, ImageModelConfig, LLMModelConfig, TTSModelConfig, VideoModelConfig } from '../types/config'
import type { ModelCapabilityProfile, ModelKind } from '../types/capability'
import { profileHasInputSlot } from './generator-ui'
import { resolveProfileForConfig } from './profile-display'

type ModelEntry = ImageModelConfig | VideoModelConfig | LLMModelConfig | TTSModelConfig

export interface ConnectedModelCandidate {
  configId: string
  name: string
  kind: ModelKind
  profile: ModelCapabilityProfile
  isDefault: boolean
}

export interface LlmRequirement {
  kind: 'llm'
  needsVision?: boolean
}

export interface ImageRequirement {
  kind: 'image'
  needsReference?: boolean
}

export interface VideoRequirement {
  kind: 'video'
  needsFirstFrame?: boolean
  needsLastFrame?: boolean
  needsReferenceImage?: boolean
  needsReferenceVideo?: boolean
  needsReferenceAudio?: boolean
}

export type ModelRequirement = LlmRequirement | ImageRequirement | VideoRequirement

export interface ModelSelectionResult {
  configId: string
  name: string
  reason?: string
}

function modelsForKind(config: AppConfig, kind: ModelKind): ModelEntry[] {
  if (kind === 'image') return config.image_models
  if (kind === 'video') return config.video_models
  if (kind === 'llm') return config.llm_models
  return config.tts_models
}

function defaultIdForKind(config: AppConfig, kind: ModelKind): string {
  if (kind === 'image') return config.settings.default_image_model
  if (kind === 'video') return config.settings.default_video_model
  if (kind === 'tts') return config.settings.default_tts
  return config.settings.default_llm
}

function profileForEntry(kind: ModelKind, entry: ModelEntry): ModelCapabilityProfile {
  return resolveProfileForConfig(entry.id, 'model' in entry ? entry.model : undefined, kind, {
    customConfig: entry.custom_config,
    endpoint: entry.endpoint,
    displayName: entry.name,
    provider: entry.provider,
  })
}

export function listConnectedModelCandidates(
  config: AppConfig,
  kind: ModelKind,
): ConnectedModelCandidate[] {
  const defaultId = defaultIdForKind(config, kind)
  return modelsForKind(config, kind).map((entry) => ({
    configId: entry.id,
    name: entry.name,
    kind,
    profile: profileForEntry(kind, entry),
    isDefault: entry.id === defaultId,
  }))
}

export function meetsRequirement(
  profile: ModelCapabilityProfile,
  requirement: ModelRequirement,
): boolean {
  if (requirement.kind === 'llm') {
    const hasVision = profile.inputs.some((s) => s.modality === 'image')
    if (requirement.needsVision) return hasVision
    return true
  }

  if (requirement.kind === 'image') {
    if (requirement.needsReference) {
      return profileHasInputSlot(profile, 'reference_image')
    }
    return profileHasInputSlot(profile, 'prompt')
  }

  if (requirement.needsLastFrame && !profileHasInputSlot(profile, 'last_frame')) return false
  if (requirement.needsFirstFrame && !profileHasInputSlot(profile, 'first_frame')) return false
  if (requirement.needsReferenceImage && !profileHasInputSlot(profile, 'reference_image')) {
    return false
  }
  if (requirement.needsReferenceVideo && !profileHasInputSlot(profile, 'reference_video')) {
    return false
  }
  if (requirement.needsReferenceAudio && !profileHasInputSlot(profile, 'reference_audio')) {
    return false
  }
  return profileHasInputSlot(profile, 'prompt')
}

function scoreCandidate(
  candidate: ConnectedModelCandidate,
  requirement: ModelRequirement,
): number {
  let score = 0
  if (candidate.isDefault) score += 100
  if (candidate.profile.confidence === 'verified') score += 40
  else if (candidate.profile.confidence === 'documented') score += 30
  if (candidate.profile.source === 'builtin') score += 20
  else if (candidate.profile.source === 'probe') score += 15

  if (requirement.kind === 'llm' && !requirement.needsVision) {
    if (!candidate.profile.inputs.some((s) => s.modality === 'image')) score += 12
  }

  if (requirement.kind === 'video' && requirement.needsLastFrame) {
    if (profileHasInputSlot(candidate.profile, 'last_frame')) score += 25
  }

  return score
}

export function selectModelForRequirement(
  config: AppConfig,
  requirement: ModelRequirement,
  preferredId?: string,
): ModelSelectionResult | null {
  const candidates = listConnectedModelCandidates(config, requirement.kind)
  if (candidates.length === 0) return null

  const matching = candidates.filter((c) => meetsRequirement(c.profile, requirement))
  const pool = matching.length > 0 ? matching : candidates

  if (preferredId) {
    const preferred = pool.find((c) => c.configId === preferredId)
    if (preferred && meetsRequirement(preferred.profile, requirement)) {
      return { configId: preferred.configId, name: preferred.name }
    }
  }

  const sorted = [...pool].sort(
    (a, b) => scoreCandidate(b, requirement) - scoreCandidate(a, requirement),
  )
  const picked = sorted[0]
  const usedFallback = matching.length === 0
  const reason =
    usedFallback
      ? '无完全匹配能力的模型，已选最接近的已接入模型'
      : picked.isDefault
        ? undefined
        : '按能力需求优选'

  return { configId: picked.configId, name: picked.name, reason }
}
