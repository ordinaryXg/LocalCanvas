import type { AppConfig, ImageModelConfig, VideoModelConfig, LLMModelConfig, TTSModelConfig } from '../types/config'
import {
  SEEDANCE_1_0_PRO_FAST_VIDEO_MODEL,
  SEEDANCE_2_0_VIDEO_MODEL,
  SEEDANCE_2_0_FAST_VIDEO_MODEL,
} from './seedance'
import { SEEDREAM_4_5_IMAGE_MODEL, SEEDREAM_4_0_IMAGE_MODEL } from './seedream'

/** 内置远端模型预设 */
export interface ModelPreset {
  id: string
  name: string
  provider: 'openai_compatible' | 'volcengine_seedance' | 'replicate' | 'custom'
  endpoint: string
  model: string
  envKey: string
  kind: 'llm' | 'image' | 'video' | 'tts'
  poll_endpoint?: string
  default_params?: Record<string, unknown>
}

export const LLM_PRESETS: ModelPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'openai_compatible',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    envKey: 'DEEPSEEK_API_KEY',
    kind: 'llm',
  },
  {
    id: 'glm-4',
    name: 'GLM-4',
    provider: 'openai_compatible',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
    envKey: 'ZHIPU_API_KEY',
    kind: 'llm',
  },
  {
    id: 'qwen3',
    name: '通义千问',
    provider: 'openai_compatible',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-max',
    envKey: 'DASHSCOPE_API_KEY',
    kind: 'llm',
  },
  {
    id: 'custom-llm',
    name: 'Custom HTTP（LLM）',
    provider: 'custom',
    endpoint: 'https://your-api.example.com/chat',
    model: 'llm-model',
    envKey: 'CUSTOM_API_KEY',
    kind: 'llm',
  },
]

export const IMAGE_PRESETS: ModelPreset[] = [
  {
    id: SEEDREAM_4_5_IMAGE_MODEL.id,
    name: SEEDREAM_4_5_IMAGE_MODEL.name,
    provider: 'openai_compatible',
    endpoint: SEEDREAM_4_5_IMAGE_MODEL.endpoint,
    model: SEEDREAM_4_5_IMAGE_MODEL.model,
    envKey: SEEDREAM_4_5_IMAGE_MODEL.envKey,
    kind: 'image',
    default_params: SEEDREAM_4_5_IMAGE_MODEL.default_params,
  },
  {
    id: SEEDREAM_4_0_IMAGE_MODEL.id,
    name: SEEDREAM_4_0_IMAGE_MODEL.name,
    provider: 'openai_compatible',
    endpoint: SEEDREAM_4_0_IMAGE_MODEL.endpoint,
    model: SEEDREAM_4_0_IMAGE_MODEL.model,
    envKey: SEEDREAM_4_0_IMAGE_MODEL.envKey,
    kind: 'image',
    default_params: SEEDREAM_4_0_IMAGE_MODEL.default_params,
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'openai_compatible',
    endpoint: 'https://api.openai.com/v1/images/generations',
    model: 'dall-e-3',
    envKey: 'OPENAI_API_KEY',
    kind: 'image',
  },
  {
    id: 'replicate-flux',
    name: 'Replicate (Flux Dev)',
    provider: 'replicate',
    endpoint: 'https://api.replicate.com/v1/predictions',
    model: 'black-forest-labs/flux-dev',
    envKey: 'REPLICATE_API_TOKEN',
    kind: 'image',
  },
  {
    id: 'custom-image',
    name: 'Custom HTTP（图像）',
    provider: 'custom',
    endpoint: 'https://your-api.example.com/generate',
    model: 'image-model',
    envKey: 'CUSTOM_API_KEY',
    kind: 'image',
  },
]

/** 视频生成 — 默认优先 Seedance 1.0 Pro Fast（测试），含 2.0 系列 */
export const VIDEO_PRESETS: ModelPreset[] = [
  {
    id: SEEDANCE_1_0_PRO_FAST_VIDEO_MODEL.id,
    name: SEEDANCE_1_0_PRO_FAST_VIDEO_MODEL.name,
    provider: 'volcengine_seedance',
    endpoint: SEEDANCE_1_0_PRO_FAST_VIDEO_MODEL.endpoint,
    poll_endpoint: SEEDANCE_1_0_PRO_FAST_VIDEO_MODEL.poll_endpoint,
    model: SEEDANCE_1_0_PRO_FAST_VIDEO_MODEL.model,
    envKey: SEEDANCE_1_0_PRO_FAST_VIDEO_MODEL.envKey,
    kind: 'video',
    default_params: SEEDANCE_1_0_PRO_FAST_VIDEO_MODEL.default_params,
  },
  {
    id: SEEDANCE_2_0_VIDEO_MODEL.id,
    name: SEEDANCE_2_0_VIDEO_MODEL.name,
    provider: 'volcengine_seedance',
    endpoint: SEEDANCE_2_0_VIDEO_MODEL.endpoint,
    poll_endpoint: SEEDANCE_2_0_VIDEO_MODEL.poll_endpoint,
    model: SEEDANCE_2_0_VIDEO_MODEL.model,
    envKey: SEEDANCE_2_0_VIDEO_MODEL.envKey,
    kind: 'video',
    default_params: SEEDANCE_2_0_VIDEO_MODEL.default_params,
  },
  {
    id: SEEDANCE_2_0_FAST_VIDEO_MODEL.id,
    name: SEEDANCE_2_0_FAST_VIDEO_MODEL.name,
    provider: 'volcengine_seedance',
    endpoint: SEEDANCE_2_0_FAST_VIDEO_MODEL.endpoint,
    poll_endpoint: SEEDANCE_2_0_FAST_VIDEO_MODEL.poll_endpoint,
    model: SEEDANCE_2_0_FAST_VIDEO_MODEL.model,
    envKey: SEEDANCE_2_0_FAST_VIDEO_MODEL.envKey,
    kind: 'video',
    default_params: SEEDANCE_2_0_FAST_VIDEO_MODEL.default_params,
  },
  {
    id: 'custom-video',
    name: 'Custom HTTP（视频）',
    provider: 'custom',
    endpoint: 'https://your-api.example.com/video',
    model: 'video-model',
    envKey: 'CUSTOM_API_KEY',
    kind: 'video',
  },
]

export const TTS_PRESETS: ModelPreset[] = [
  {
    id: 'cosyvoice-cloud',
    name: 'CosyVoice（云端）',
    provider: 'openai_compatible',
    endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2speech/synthesis',
    model: 'cosyvoice-v1',
    envKey: 'DASHSCOPE_API_KEY',
    kind: 'tts',
  },
]

export function seedanceVideoConfigFromPreset(preset: ModelPreset, apiKey = ''): VideoModelConfig {
  const maxDuration =
    preset.id === SEEDANCE_1_0_PRO_FAST_VIDEO_MODEL.id
      ? 12
      : preset.id.startsWith('seedance-2')
        ? 15
        : 12
  const resolutions =
    preset.id.startsWith('seedance-2')
      ? (['480p', '720p', '1080p', '2K'] as const)
      : (['480p', '720p', '1080p'] as const)

  return {
    id: preset.id,
    name: preset.name,
    provider: 'volcengine_seedance',
    endpoint: preset.endpoint,
    poll_endpoint: preset.poll_endpoint,
    model: preset.model,
    api_key: apiKey,
    max_duration: maxDuration,
    supported_resolutions: [...resolutions],
    default_params: preset.default_params,
  }
}

export function buildDefaultImageModels(): ImageModelConfig[] {
  return IMAGE_PRESETS.filter((p) => p.id === SEEDREAM_4_5_IMAGE_MODEL.id).map((p) =>
    presetToModelConfig(p, '') as ImageModelConfig,
  )
}

export function buildDefaultSeedanceVideoModels(): VideoModelConfig[] {
  return VIDEO_PRESETS.map((p) => seedanceVideoConfigFromPreset(p, ''))
}

export function presetToModelConfig(
  preset: ModelPreset,
  apiKey = '',
): ImageModelConfig | VideoModelConfig | LLMModelConfig | TTSModelConfig {
  if (preset.kind === 'video') {
    if (preset.provider === 'custom') {
      return {
        id: preset.id,
        name: preset.name,
        provider: 'custom',
        endpoint: preset.endpoint,
        api_key: apiKey,
        model: preset.model,
        custom_config: {
          endpoint: preset.endpoint,
          method: 'POST',
          request_template: { prompt: '{{prompt}}', model: preset.model },
          response_mapping: { output_url: 'data.url', status: 'data.status' },
          poll_config: { enabled: true, interval_ms: 3000, completion_status: 'completed' },
        },
      }
    }
    return seedanceVideoConfigFromPreset(preset, apiKey)
  }
  if (preset.kind === 'llm') {
    return {
      id: preset.id,
      name: preset.name,
      provider: preset.provider,
      endpoint: preset.endpoint,
      api_key: apiKey,
      model: preset.model,
    }
  }
  if (preset.kind === 'image') {
    const base = {
      id: preset.id,
      name: preset.name,
      provider: preset.provider,
      endpoint: preset.endpoint,
      api_key: apiKey,
      model: preset.model,
    }
    if (preset.provider === 'custom') {
      return {
        ...base,
        custom_config: {
          endpoint: preset.endpoint,
          method: 'POST',
          request_template: { prompt: '{{prompt}}', model: preset.model },
          response_mapping: { output_url: 'data.url' },
        },
      }
    }
    return base
  }
  return {
    id: preset.id,
    name: preset.name,
    provider: preset.provider,
    endpoint: preset.endpoint,
    api_key: apiKey,
    model: preset.model,
    ...(preset.provider === 'custom'
      ? {
          custom_config: {
            endpoint: preset.endpoint,
            method: 'POST',
            request_template: { text: '{{prompt}}', model: preset.model },
            response_mapping: { text: 'data.text' },
          },
        }
      : {}),
  }
}

export function getPresetsForTab(tab: 'image' | 'video' | 'llm' | 'tts'): ModelPreset[] {
  if (tab === 'image') return IMAGE_PRESETS
  if (tab === 'video') return VIDEO_PRESETS
  if (tab === 'tts') return TTS_PRESETS
  return LLM_PRESETS
}
