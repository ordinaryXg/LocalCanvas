import { describe, expect, it } from 'vitest'
import type { AppConfig } from '../types/config'
import { resolveEffectiveArkApiKey, resolveEffectiveArkApiKeyFromConfig } from './configResolve'

const baseConfig = (): AppConfig => ({
  image_models: [
    {
      id: 'seedream',
      name: 'Seedream',
      provider: 'openai_compatible',
      endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
      api_key: 'ark-image-key-12345678',
      model: 'doubao-seedream',
    },
  ],
  video_models: [
    {
      id: 'seedance-2-0',
      name: 'Seedance 2.0',
      provider: 'volcengine_seedance',
      endpoint: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
      model: 'doubao-seedance-2-0-260128',
      api_key: '',
      max_duration: 15,
      supported_resolutions: ['720p'],
    },
    {
      id: 'seedance-1-5-pro',
      name: 'Seedance 1.5',
      provider: 'volcengine_seedance',
      endpoint: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
      model: 'doubao-seedance-1-5-pro-251215',
      api_key: 'ark-video-key-12345678',
      max_duration: 12,
      supported_resolutions: ['720p'],
    },
  ],
  llm_models: [],
  tts_models: [],
  settings: {
    default_image_model: 'seedream',
    default_video_model: 'seedance-1-5-pro',
    default_llm: '',
    default_tts: '',
    output_dir: '',
    temp_dir: '',
    max_concurrent_tasks: 3,
    auto_save_interval: 30,
    ffmpeg_path: '',
    onboarding_completed: true,
  },
})

describe('resolveEffectiveArkApiKey', () => {
  it('falls back to sibling Seedance model key', () => {
    const config = baseConfig()
    const model = config.video_models[0]
    expect(resolveEffectiveArkApiKey(model, config.video_models, config.image_models)).toBe(
      'ark-video-key-12345678',
    )
  })

  it('falls back to image ARK key when no video key exists', () => {
    const config = baseConfig()
    config.video_models = config.video_models.map((m) => ({ ...m, api_key: '' }))
    const model = config.video_models[0]
    expect(resolveEffectiveArkApiKey(model, config.video_models, config.image_models)).toBe(
      'ark-image-key-12345678',
    )
  })

  it('resolves from config by model id', () => {
    const config = baseConfig()
    expect(resolveEffectiveArkApiKeyFromConfig(config, 'seedance-2-0')).toBe(
      'ark-video-key-12345678',
    )
  })
})
