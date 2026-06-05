import { BUILTIN_PROFILES } from './builtin/profiles'
import type { CustomAdapterConfig } from '../types/config'
import type { ModelCapabilityProfile, ModelKind } from '../types/capability'
import { inferProfileFromCustomConfig } from './custom-infer'
import { getProbedProfile } from './probed-profile-cache'

export interface ResolveProfileInput {
  model?: string
  configId?: string
  kind?: ModelKind
  customConfig?: CustomAdapterConfig
  endpoint?: string
  displayName?: string
}

function matchPattern(pattern: string, model: string): boolean {
  if (pattern === model) return true
  if (pattern.endsWith('*')) {
    return model.startsWith(pattern.slice(0, -1))
  }
  return false
}

function providerFallback(kind: ModelKind): ModelCapabilityProfile {
  const textIn = [{ id: 'prompt', modality: 'text' as const, max_count: 1 }]
  const imageIn = [
    { id: 'prompt', modality: 'text' as const, required: true, max_count: 1 },
    { id: 'reference_image', modality: 'image' as const, max_count: 1 },
  ]
  const videoIn = [
    { id: 'prompt', modality: 'text' as const, max_count: 1 },
    { id: 'first_frame', modality: 'image' as const, max_count: 1 },
  ]

  const inputs =
    kind === 'image' ? imageIn : kind === 'video' ? videoIn : kind === 'tts' ? textIn : textIn

  const outputs =
    kind === 'image'
      ? [{ modality: 'image' as const }]
      : kind === 'video'
        ? [{ modality: 'video' as const, async: true }]
        : kind === 'tts'
          ? [{ modality: 'audio' as const }]
          : [{ modality: 'text' as const }]

  return {
    profile_key: `inferred-${kind}`,
    provider: 'inferred',
    model_pattern: '*',
    kind,
    display_name: `未知 ${kind} 模型`,
    inputs,
    outputs,
    confidence: 'inferred',
    source: 'inferred',
    version: 1,
  }
}

export function resolveProfile(input: ResolveProfileInput): ModelCapabilityProfile {
  const { model = '', configId = '', kind = 'llm', customConfig, endpoint, displayName } = input

  if (configId) {
    const probed = getProbedProfile(configId)
    if (probed) return probed

    const byConfig = BUILTIN_PROFILES.find((p) => p.config_ids?.includes(configId))
    if (byConfig) return byConfig
  }

  if (configId && (customConfig || endpoint)) {
    return inferProfileFromCustomConfig(kind, configId, displayName ?? configId, {
      customConfig,
      endpoint,
      apiModel: model,
    })
  }

  if (model) {
    const exact = BUILTIN_PROFILES.find((p) => p.model_pattern === model)
    if (exact) return exact

    const glob = BUILTIN_PROFILES.find((p) => matchPattern(p.model_pattern, model))
    if (glob) return glob

    for (const profile of BUILTIN_PROFILES) {
      const alias = profile.aliases?.find((a) => a.deprecated_id === model)
      if (alias) {
        const target = BUILTIN_PROFILES.find((p) => p.model_pattern === alias.maps_to)
        if (target) return target
        const byKey = BUILTIN_PROFILES.find((p) => p.profile_key === alias.maps_to)
        if (byKey) return byKey
      }
    }
  }

  return providerFallback(kind)
}

export function resolveModelIdWithAlias(model: string): {
  model: string
  migratedFrom?: string
  defaultThinkingPreset?: 'off' | 'balanced' | 'deep'
} {
  for (const profile of BUILTIN_PROFILES) {
    const alias = profile.aliases?.find((a) => a.deprecated_id === model)
    if (alias) {
      const target = BUILTIN_PROFILES.find(
        (p) => p.profile_key === alias.maps_to || p.model_pattern === alias.maps_to,
      )
      return {
        model: target?.model_pattern ?? alias.maps_to,
        migratedFrom: model,
        defaultThinkingPreset: alias.runtime_default,
      }
    }
  }
  return { model }
}

export function listBuiltinProfiles(): ModelCapabilityProfile[] {
  return BUILTIN_PROFILES
}

export function getProfileByKey(profileKey: string): ModelCapabilityProfile | undefined {
  return BUILTIN_PROFILES.find((p) => p.profile_key === profileKey)
}
