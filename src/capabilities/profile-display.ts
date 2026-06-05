import type { ModelCapabilityProfile, ModelKind, Modality } from '../types/capability'
import { resolveProfile } from './registry'
import { CATALOG_VERSION } from './builtin/profiles'

const MODALITY_SHORT: Record<Modality, string> = {
  text: '文',
  image: '图',
  video: '视频',
  audio: '音频',
}

const KIND_LABEL: Record<ModelKind, string> = {
  llm: 'LLM',
  image: '图像',
  video: '视频',
  tts: '语音',
}

export function getCatalogVersion(): number {
  return CATALOG_VERSION
}

export function resolveProfileForConfig(
  configId: string,
  apiModel?: string,
  kind?: ModelKind,
  options?: {
    customConfig?: import('../types/config').CustomAdapterConfig
    endpoint?: string
    displayName?: string
    provider?: string
  },
): ModelCapabilityProfile {
  return resolveProfile({
    configId,
    model: apiModel,
    kind,
    customConfig: options?.customConfig,
    endpoint: options?.endpoint,
    displayName: options?.displayName,
  })
}

export function kindLabel(kind: ModelKind): string {
  return KIND_LABEL[kind]
}

export function formatInputBadges(profile: ModelCapabilityProfile): string[] {
  return profile.inputs.map((slot) => {
    const base = MODALITY_SHORT[slot.modality]
    if (slot.max_count > 1) return `${base}≤${slot.max_count}`
    if (slot.required) return `${base}*`
    return base
  })
}

export function formatOutputBadges(profile: ModelCapabilityProfile): string[] {
  return profile.outputs.map((out) => {
    const base = MODALITY_SHORT[out.modality]
    return out.async ? `${base}(异步)` : base
  })
}

export function formatReasoningBadge(profile: ModelCapabilityProfile): string | null {
  const r = profile.reasoning
  if (!r || r.ui_preset === 'hidden') return null
  if (r.ui_preset === 'model_implied') return '推理专用'
  if (r.control_kind === 'always_reasoning') return '思考：仅调强度'
  return '思考：可关'
}

export function formatConfidenceBadge(profile: ModelCapabilityProfile): string {
  if (profile.source === 'probe') return '已探测'
  if (profile.confidence === 'documented' || profile.confidence === 'verified') {
    return profile.source === 'builtin' ? '内置目录' : '已验证'
  }
  if (profile.source === 'inferred') return '推断能力'
  return '未验证'
}

export function profileNeedsProbe(profile: ModelCapabilityProfile): boolean {
  return profile.source === 'inferred' || profile.confidence === 'unknown'
}

export function collectAliasNotes(profile: ModelCapabilityProfile): string[] {
  return (profile.aliases ?? [])
    .filter((a) => a.sunset)
    .map((a) => `${a.deprecated_id} 将于 ${a.sunset?.slice(0, 10)} 停用`)
}

export function hasApiKey(apiKey?: string): boolean {
  return Boolean(apiKey?.trim())
}
