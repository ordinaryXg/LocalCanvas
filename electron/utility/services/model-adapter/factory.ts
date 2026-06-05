import type {
  AppConfig,
  ImageModelConfig,
  VideoModelConfig,
  LLMModelConfig,
  TTSModelConfig,
} from '../../../../src/types/config'
import { AdapterError, AdapterErrorCode } from '../../../../src/types/adapter-errors'
import { ModelAdapter } from './base'
import { RemoteApiAdapter } from './remote-api'
import { SeedanceAdapter } from './seedance'
import { ReplicateAdapter } from './replicate'
import { CustomAdapter } from './custom'

export interface AdapterRegistryOptions {
  outputDir: string
}

export class AdapterRegistry {
  private instances = new Map<string, ModelAdapter>()
  private config: AppConfig | null = null
  private options: AdapterRegistryOptions

  constructor(options: AdapterRegistryOptions) {
    this.options = options
  }

  reloadFromConfig(config: AppConfig): void {
    this.config = config
    this.instances.clear()
  }

  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('AdapterRegistry not initialized with config')
    }
    return this.config
  }

  getImageAdapter(modelId: string): ModelAdapter {
    const modelConfig = this.getConfig().image_models.find((m) => m.id === modelId)
    if (!modelConfig) {
      throw new AdapterError(
        `Image model not found: ${modelId}`,
        'openai',
        AdapterErrorCode.MODEL_NOT_FOUND,
        false,
        `未找到图像模型「${modelId}」。请在 ⚙️ 模型配置 → 设置 中选择「默认图像模型」并保存`,
      )
    }
    if (!modelConfig.api_key?.trim()) {
      throw new AdapterError(
        'Image model API key missing',
        'openai',
        AdapterErrorCode.AUTH_FAILED,
        false,
        `图像模型「${modelConfig.name}」未配置 API Key，请在模型配置 → 图像 中填写 ARK API Key`,
      )
    }
    return this.createGenericAdapter(`image:${modelId}`, modelConfig)
  }

  getVideoAdapter(modelId: string): ModelAdapter {
    const modelConfig = this.getConfig().video_models.find((m) => m.id === modelId)
    if (!modelConfig) throw new Error(`Video model not found: ${modelId}`)
    return this.createVideoAdapter(modelConfig)
  }

  getLLMAdapter(modelId: string): ModelAdapter {
    const modelConfig = this.getConfig().llm_models.find((m) => m.id === modelId)
    if (!modelConfig) throw new Error(`LLM model not found: ${modelId}`)
    return this.createGenericAdapter(`llm:${modelId}`, modelConfig)
  }

  getTTSAdapter(modelId: string): ModelAdapter {
    const modelConfig = this.getConfig().tts_models.find((m) => m.id === modelId)
    if (!modelConfig) throw new Error(`TTS model not found: ${modelId}`)
    return this.createGenericAdapter(`tts:${modelId}`, modelConfig)
  }

  private createGenericAdapter(
    key: string,
    config: ImageModelConfig | LLMModelConfig | TTSModelConfig,
  ): ModelAdapter {
    const cached = this.instances.get(key)
    if (cached) return cached

    let adapter: ModelAdapter
    if (config.provider === 'replicate') {
      if (!config.api_key?.trim()) {
        throw new AdapterError(
          'Replicate API token missing',
          'custom',
          AdapterErrorCode.AUTH_FAILED,
          false,
          `模型「${config.name}」未配置 Replicate API Token`,
        )
      }
      adapter = new ReplicateAdapter(config.api_key, this.options.outputDir)
    } else if (config.provider === 'custom' && config.custom_config) {
      adapter = new CustomAdapter(config.custom_config, this.options.outputDir)
    } else {
      adapter = new RemoteApiAdapter({
        endpoint: config.endpoint,
        apiKey: config.api_key || '',
        model: config.model,
        outputDir: this.options.outputDir,
      })
    }
    this.instances.set(key, adapter)
    return adapter
  }

  private createVideoAdapter(config: VideoModelConfig): ModelAdapter {
    const key = `video:${config.id}`
    const cached = this.instances.get(key)
    if (cached) return cached

    let adapter: ModelAdapter
    if (config.provider === 'volcengine_seedance') {
      adapter = new SeedanceAdapter({
        apiKey: config.api_key || '',
        model: config.model,
        outputDir: this.options.outputDir,
        createEndpoint: config.endpoint,
        pollEndpoint: config.poll_endpoint,
        defaultParams: config.default_params,
      })
    } else if (config.provider === 'replicate') {
      if (!config.api_key?.trim()) {
        throw new AdapterError(
          'Replicate API token missing',
          'custom',
          AdapterErrorCode.AUTH_FAILED,
          false,
          `视频模型「${config.name}」未配置 Replicate API Token`,
        )
      }
      adapter = new ReplicateAdapter(config.api_key, this.options.outputDir)
    } else if (config.provider === 'custom' && config.custom_config) {
      adapter = new CustomAdapter(config.custom_config, this.options.outputDir)
    } else {
      adapter = new RemoteApiAdapter({
        endpoint: config.endpoint,
        apiKey: config.api_key || '',
        model: config.model,
        outputDir: this.options.outputDir,
        pollEndpoint: config.poll_endpoint,
      })
    }

    this.instances.set(key, adapter)
    return adapter
  }
}
