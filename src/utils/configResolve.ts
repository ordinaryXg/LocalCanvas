import type { AppConfig, ImageModelConfig, VideoModelConfig } from '../types/config'
import { resolveFirstUsableApiKey } from './apiKey'

/** 解析可用的默认图像模型 config id */
export function resolveDefaultImageModelId(config: AppConfig): string | null {
  const preferred = config.settings.default_image_model?.trim()
  if (preferred && config.image_models.some((m) => m.id === preferred)) {
    return preferred
  }
  const withKey = config.image_models.find((m) => m.api_key?.trim())
  if (withKey) return withKey.id
  if (config.image_models.length > 0) return config.image_models[0].id
  return null
}

export function resolveDefaultVideoModelId(config: AppConfig): string | null {
  const preferred = config.settings.default_video_model?.trim()
  if (preferred && config.video_models.some((m) => m.id === preferred)) {
    return preferred
  }
  const withKey = config.video_models.find((m) => m.api_key?.trim())
  if (withKey) return withKey.id
  if (config.video_models.length > 0) return config.video_models[0].id
  return null
}

export function resolveDefaultLlmModelId(config: AppConfig): string | null {
  const preferred = config.settings.default_llm?.trim()
  if (preferred && config.llm_models.some((m) => m.id === preferred)) {
    return preferred
  }
  const withKey = config.llm_models.find((m) => m.api_key?.trim())
  if (withKey) return withKey.id
  if (config.llm_models.length > 0) return config.llm_models[0].id
  return null
}

export function getImageModelConfig(config: AppConfig, modelId: string) {
  return config.image_models.find((m) => m.id === modelId)
}

export function getVideoModelConfig(config: AppConfig, modelId: string) {
  return config.video_models.find((m) => m.id === modelId)
}

/** Seedance 模型可复用同账号 ARK Key（视频/图像模型间回退） */
export function resolveEffectiveArkApiKey(
  model: VideoModelConfig,
  videoModels: VideoModelConfig[],
  imageModels: ImageModelConfig[] = [],
): string {
  if (model.provider !== 'volcengine_seedance') {
    return resolveFirstUsableApiKey(model.api_key)
  }
  return resolveFirstUsableApiKey(
    model.api_key,
    ...videoModels
      .filter((m) => m.provider === 'volcengine_seedance')
      .map((m) => m.api_key),
    ...imageModels
      .filter((m) => /volces|ark\.cn-beijing/i.test(m.endpoint ?? ''))
      .map((m) => m.api_key),
  )
}

export function resolveEffectiveArkApiKeyFromConfig(
  config: AppConfig,
  modelId: string,
): string {
  const model = getVideoModelConfig(config, modelId)
  if (!model) return ''
  return resolveEffectiveArkApiKey(model, config.video_models, config.image_models)
}

export function getLlmModelConfig(config: AppConfig, modelId: string) {
  return config.llm_models.find((m) => m.id === modelId)
}
