import type {
  AppConfig,
  ImageModelConfig,
  LLMModelConfig,
  TTSModelConfig,
  VideoModelConfig,
} from '../../types/config'
import type { ModelKind } from '../../types/capability'

export type ModelEntry = ImageModelConfig | VideoModelConfig | LLMModelConfig | TTSModelConfig
export type KindFilter = 'all' | ModelKind

export interface ConnectedModel {
  kind: ModelKind
  model: ModelEntry
}

export const FILTER_OPTIONS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'llm', label: 'LLM' },
  { id: 'image', label: '图像' },
  { id: 'video', label: '视频' },
  { id: 'tts', label: '语音' },
]

export function defaultKeyForKind(kind: ModelKind): keyof AppConfig['settings'] {
  if (kind === 'image') return 'default_image_model'
  if (kind === 'video') return 'default_video_model'
  if (kind === 'tts') return 'default_tts'
  return 'default_llm'
}

export function listConnectedModels(config: AppConfig, filter: KindFilter): ConnectedModel[] {
  const items: ConnectedModel[] = []
  const push = (kind: ModelKind, models: ModelEntry[]) => {
    for (const model of models) items.push({ kind, model })
  }
  if (filter === 'all' || filter === 'llm') push('llm', config.llm_models)
  if (filter === 'all' || filter === 'image') push('image', config.image_models)
  if (filter === 'all' || filter === 'video') push('video', config.video_models)
  if (filter === 'all' || filter === 'tts') push('tts', config.tts_models)
  return items
}

export function sortConnectedWithDefaultsFirst(
  items: ConnectedModel[],
  settings: AppConfig['settings'],
): ConnectedModel[] {
  const isDefaultForKind = (kind: ModelKind, id: string) =>
    settings[defaultKeyForKind(kind)] === id

  return [...items].sort((a, b) => {
    const aDefault = isDefaultForKind(a.kind, a.model.id)
    const bDefault = isDefaultForKind(b.kind, b.model.id)
    if (aDefault === bDefault) return 0
    return aDefault ? -1 : 1
  })
}

export function isDefaultModel(
  config: AppConfig,
  kind: ModelKind,
  id: string,
): boolean {
  return config.settings[defaultKeyForKind(kind)] === id
}
