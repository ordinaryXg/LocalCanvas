import type { AppConfig } from '../types/config'

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
