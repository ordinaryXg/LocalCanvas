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
  kind: ModelKind
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
    return dataArr
      .map((item) => {
        if (typeof item !== 'object' || !item || !('id' in item)) return null
        const id = (item as { id: unknown }).id
        return typeof id === 'string' && id.length > 0 ? id : null
      })
      .filter((id): id is string => Boolean(id))
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

export function inferKindForModel(modelId: string, hintKind?: ModelKind): ModelKind {
  const ordered: ModelKind[] = hintKind
    ? [hintKind, 'video', 'image', 'tts', 'llm'].filter(
        (k, i, arr) => arr.indexOf(k) === i,
      ) as ModelKind[]
    : ['video', 'image', 'tts', 'llm']

  for (const kind of ordered) {
    const profile = resolveProfile({ model: modelId, kind })
    if (profile.source === 'builtin') return kind
  }

  if (/seedance|video|sora|cogvideo/i.test(modelId)) return 'video'
  if (/seedream|dall-e|flux|midjourney|gpt-image|image/i.test(modelId)) return 'image'
  if (/tts|speech|voice/i.test(modelId)) return 'tts'
  return hintKind ?? 'llm'
}

export function mapDiscoveredModel(
  modelId: string,
  hintKind?: ModelKind,
): MappedDiscoveredModel {
  const kind = inferKindForModel(modelId, hintKind)
  const profile = resolveProfile({ model: modelId, kind })
  const in_catalog = profile.source === 'builtin'
  const preset = findPresetForModel(modelId, kind)
  return { model_id: modelId, kind, profile, in_catalog, preset }
}

function findPresetForModel(modelId: string, kind: ModelKind): ModelPreset | undefined {
  const exact = ALL_PRESETS.find((p) => p.kind === kind && p.model === modelId)
  if (exact) return exact
  return ALL_PRESETS.find(
    (p) =>
      p.kind === kind &&
      (modelId.startsWith(p.model) || p.model.startsWith(modelId.split('-')[0] ?? '')),
  )
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
