import {
  IMAGE_PRESETS,
  LLM_PRESETS,
  TTS_PRESETS,
  VIDEO_PRESETS,
  type ModelPreset,
} from '../constants/modelPresets'
import { SEEDANCE_ENDPOINTS } from '../constants/seedance'
import type { AppConfig } from '../types/config'
import type { Confidence, ModelCapabilityProfile, ModelKind } from '../types/capability'
import type { DiscoveredModelEntry } from '../types/capability-sync'
import { CATALOG_VERSION } from './builtin/profiles'
import { resolveProfile } from './registry'

const ALL_PRESETS: ModelPreset[] = [
  ...LLM_PRESETS,
  ...IMAGE_PRESETS,
  ...VIDEO_PRESETS,
  ...TTS_PRESETS,
]

export interface SyncCredentialSource {
  provider_key: string
  provider: string
  endpoint: string
  api_key: string
  hint_kind?: ModelKind
}

export interface MappedDiscoveredModel {
  model_id: string
  kind: ModelKind | null
  profile: ModelCapabilityProfile
  in_catalog: boolean
  preset?: ModelPreset
}

export function getCatalogVersionForSync(): number {
  return CATALOG_VERSION
}

export function cacheTtlMs(confidence: Confidence): number {
  const days = confidence === 'verified' ? 7 : confidence === 'documented' ? 30 : 1
  return days * 24 * 60 * 60 * 1000
}

export function buildModelsListUrl(provider: string, endpoint: string): string | null {
  if (provider === 'volcengine_seedance') {
    return SEEDANCE_ENDPOINTS.models
  }
  if (endpoint.includes('api.anthropic.com')) {
    return 'https://api.anthropic.com/v1/models'
  }
  if (endpoint.includes('generativelanguage.googleapis.com')) {
    const base = endpoint.split('/v1')[0]
    return `${base}/v1/models`
  }
  if (endpoint.includes('/images/generations')) {
    return SEEDANCE_ENDPOINTS.models
  }
  const modelsUrl = endpoint.replace(
    /\/(chat\/completions|images\/generations|video-synthesis|text2speech\/synthesis|contents\/generations\/tasks|messages).*$/,
    '/models',
  )
  if (modelsUrl !== endpoint) return modelsUrl
  return null
}

export function parseModelsListResponse(data: unknown): string[] {
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>
  const dataArr = obj.data
  if (Array.isArray(dataArr)) {
    const ids = dataArr
      .map((item) => {
        if (typeof item !== 'object' || !item || !('id' in item)) return null
        const id = (item as { id: unknown }).id
        return typeof id === 'string' && id.length > 0 ? id : null
      })
      .filter((id): id is string => Boolean(id))
    return [...new Set(ids)]
  }
  return []
}

export function collectSyncCredentialSources(config: AppConfig): SyncCredentialSource[] {
  const seen = new Map<string, SyncCredentialSource>()
  const add = (
    provider: string,
    endpoint: string,
    apiKey: string | undefined,
    hintKind: ModelKind,
  ) => {
    const key = apiKey?.trim()
    if (!key) return
    const providerKey = `${provider}::${endpoint}`
    if (seen.has(providerKey)) return
    seen.set(providerKey, {
      provider_key: providerKey,
      provider,
      endpoint,
      api_key: key,
      hint_kind: hintKind,
    })
  }

  for (const m of config.llm_models) add(m.provider, m.endpoint, m.api_key, 'llm')
  for (const m of config.image_models) add(m.provider, m.endpoint, m.api_key, 'image')
  for (const m of config.video_models) add(m.provider, m.endpoint, m.api_key, 'video')
  for (const m of config.tts_models) add(m.provider, m.endpoint, m.api_key, 'tts')

  return [...seen.values()]
}

export function inferKindForModel(modelId: string, hintKind?: ModelKind): ModelKind | null {
  const profile = resolveProfile({ model: modelId, kind: hintKind ?? 'llm' })
  if (profile.source === 'builtin') return profile.kind

  if (/seedance|video|sora|cogvideo/i.test(modelId)) return 'video'
  if (/seedream|dall-e|flux|midjourney|gpt-image/i.test(modelId)) return 'image'
  if (/tts|speech|voice/i.test(modelId)) return 'tts'
  if (/deepseek|gpt-|o[134]|claude|gemini|qwen|glm|kimi|llm|instruct|chat/i.test(modelId)) {
    return 'llm'
  }
  return null
}

export function shouldCacheDiscoveredModel(mapped: MappedDiscoveredModel): boolean {
  return mapped.in_catalog && mapped.kind !== null
}

export function shouldShowDiscoveredModel(mapped: MappedDiscoveredModel): boolean {
  return shouldCacheDiscoveredModel(mapped)
}

export function mapDiscoveredModel(
  modelId: string,
  hintKind?: ModelKind,
): MappedDiscoveredModel {
  const kind = inferKindForModel(modelId, hintKind)
  const profileKind = kind ?? hintKind ?? 'llm'
  const profile = resolveProfile({ model: modelId, kind: profileKind })
  const in_catalog = profile.source === 'builtin'
  const preset = kind ? findPresetForModel(modelId, kind) : undefined
  return { model_id: modelId, kind, profile, in_catalog, preset }
}

function findPresetForModel(modelId: string, kind: ModelKind): ModelPreset | undefined {
  const exact = ALL_PRESETS.find((p) => p.kind === kind && p.model === modelId)
  if (exact) return exact

  const byPrefix = ALL_PRESETS.find(
    (p) => p.kind === kind && (modelId.startsWith(p.model) || modelId.startsWith(`${p.model}-`)),
  )
  if (byPrefix) return byPrefix

  const profile = resolveProfile({ model: modelId, kind })
  if (profile.source !== 'builtin') return undefined

  if (profile.config_ids?.length) {
    for (const configId of profile.config_ids) {
      const byConfig = ALL_PRESETS.find((p) => p.kind === kind && p.id === configId)
      if (byConfig) return byConfig
    }
  }

  if (profile.profile_key) {
    return ALL_PRESETS.find((p) => p.kind === kind && p.profile_key === profile.profile_key)
  }

  return undefined
}

export function isModelAlreadyConfigured(config: AppConfig, modelId: string): boolean {
  const all = [
    ...config.llm_models,
    ...config.image_models,
    ...config.video_models,
    ...config.tts_models,
  ]
  return all.some((m) => {
    if ('model' in m && m.model === modelId) return true
    return m.id === modelId
  })
}

export function isPresetAlreadyConfigured(config: AppConfig, presetId: string): boolean {
  const allIds = new Set([
    ...config.llm_models.map((m) => m.id),
    ...config.image_models.map((m) => m.id),
    ...config.video_models.map((m) => m.id),
    ...config.tts_models.map((m) => m.id),
  ])
  return allIds.has(presetId)
}

/** 将内置目录中尚未接入的预设补入「可添加」列表（不依赖厂商 /models 是否返回） */
export function supplementDiscoveredWithCatalog(
  config: AppConfig,
  entries: DiscoveredModelEntry[],
): DiscoveredModelEntry[] {
  const seenPresets = new Set(entries.map((e) => e.preset_id).filter(Boolean))
  const seenModels = new Set(entries.map((e) => e.model_id))
  const merged = [...entries]

  for (const preset of ALL_PRESETS) {
    if (!preset.profile_key) continue
    if (isPresetAlreadyConfigured(config, preset.id)) continue
    if (seenPresets.has(preset.id) || seenModels.has(preset.model)) continue

    const mapped = mapDiscoveredModel(preset.model, preset.kind)
    if (!shouldShowDiscoveredModel(mapped) || mapped.kind === null || !mapped.preset) continue

    merged.push({
      model_id: preset.model,
      kind: mapped.kind,
      profile_key: mapped.profile.profile_key,
      display_name: preset.name,
      in_catalog: true,
      already_added: false,
      has_preset: true,
      preset_id: preset.id,
      confidence: mapped.profile.confidence,
    })
    seenPresets.add(preset.id)
    seenModels.add(preset.model)
  }

  return merged.sort((a, b) => {
    if (a.in_catalog !== b.in_catalog) return a.in_catalog ? -1 : 1
    return a.model_id.localeCompare(b.model_id)
  })
}
