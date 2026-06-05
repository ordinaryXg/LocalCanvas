export type ModelProvider = 'openai_compatible' | 'volcengine_seedance' | 'replicate' | 'custom'

export interface CustomAdapterConfig {
  endpoint: string
  method: string
  headers?: Record<string, string>
  request_template: Record<string, unknown>
  response_mapping: {
    output_url?: string
    status?: string
    text?: string
  }
  poll_config?: {
    enabled: boolean
    endpoint?: string
    interval_ms?: number
    completion_status?: string
  }
}

export interface ImageModelConfig {
  id: string
  name: string
  provider: ModelProvider
  endpoint: string
  api_key?: string
  model: string
  max_resolution?: number
  supported_ratios?: string[]
  default_params?: Record<string, unknown>
  custom_config?: CustomAdapterConfig
}

export interface VideoModelConfig {
  id: string
  name: string
  provider: ModelProvider
  endpoint: string
  api_key?: string
  model: string
  /** 异步任务轮询地址（可选，含 {task_id} 占位符） */
  poll_endpoint?: string
  max_duration?: number
  supported_resolutions?: string[]
  default_params?: Record<string, unknown>
  custom_config?: CustomAdapterConfig
}

export interface LLMModelConfig {
  id: string
  name: string
  provider: ModelProvider
  endpoint: string
  api_key?: string
  model: string
  max_tokens?: number
  custom_config?: CustomAdapterConfig
}

export interface TTSModelConfig {
  id: string
  name: string
  provider: ModelProvider
  endpoint: string
  api_key?: string
  model: string
  method?: string
  custom_config?: CustomAdapterConfig
}

export interface AppSettings {
  default_image_model: string
  default_video_model: string
  default_llm: string
  default_tts: string
  output_dir: string
  temp_dir: string
  max_concurrent_tasks: number
  auto_save_interval: number
  ffmpeg_path: string
  demucs_path?: string
  vocal_separation_endpoint?: string
  vocal_separation_api_key?: string
  onboarding_completed?: boolean
}

export interface AppConfig {
  image_models: ImageModelConfig[]
  video_models: VideoModelConfig[]
  llm_models: LLMModelConfig[]
  tts_models: TTSModelConfig[]
  settings: AppSettings
}

export interface ConnectionTestResult {
  ok: boolean
  message: string
}
