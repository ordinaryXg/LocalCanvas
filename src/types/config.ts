export type ModelProvider = 'openai_compatible' | 'volcengine_seedance' | 'custom'

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
}

export interface LLMModelConfig {
  id: string
  name: string
  provider: ModelProvider
  endpoint: string
  api_key?: string
  model: string
  max_tokens?: number
}

export interface TTSModelConfig {
  id: string
  name: string
  provider: ModelProvider
  endpoint: string
  api_key?: string
  model: string
  method?: string
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
