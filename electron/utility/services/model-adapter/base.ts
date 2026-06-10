import { EventEmitter } from 'events'
import type { TextGenerateResult } from '../../../src/utils/textGenerateResult'

export interface GenerateImageParams {
  prompt: string
  negativePrompt?: string
  width: number
  height: number
  model: string
  seed?: number
  steps?: number
  cfg?: number
  referenceImage?: string
  /** 多参考图（Seedream 等） */
  referenceImages?: string[]
  referenceStrength?: number
  batchSize?: number
  nodeId?: string
  taskId?: string
}

export interface GenerateVideoParams {
  prompt: string
  width: number
  height: number
  duration: number
  model: string
  firstFrame?: string
  lastFrame?: string
  /** Seedance 2.0 风格/角色参考图（≤9） */
  referenceImages?: string[]
  referenceVideo?: string
  referenceAudio?: string
  seed?: number
  steps?: number
  cfg?: number
  camera?: string
  nodeId?: string
  /** Seedance 2.0：宽高比 */
  ratio?: string
  /** Seedance 2.0：480p / 720p / 1080p / 2K */
  resolution?: string
  /** Seedance 2.0：是否生成同步音频 */
  generateAudio?: boolean
  taskId?: string
}

export interface GenerateTextParams {
  prompt: string
  systemPrompt?: string
  model: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
  thinkingPreset?: 'off' | 'balanced' | 'deep'
  /** Vision 多图（OpenAI 兼容 image_url） */
  images?: string[]
  nodeId?: string
  taskId?: string
}

export interface GenerateAudioParams {
  text: string
  voice?: string
  model: string
  nodeId?: string
  taskId?: string
}

export interface AdapterStatus {
  available: boolean
  message: string
  models?: string[]
}

export interface ProgressEvent {
  taskId: string
  nodeId?: string
  value: number
  max: number
  percentage: number
}

export abstract class ModelAdapter extends EventEmitter {
  abstract generateImage(params: GenerateImageParams): Promise<string>
  abstract generateVideo(params: GenerateVideoParams): Promise<string>
  abstract generateText(params: GenerateTextParams): Promise<TextGenerateResult>
  abstract generateAudio(params: GenerateAudioParams): Promise<string>
  abstract getStatus(): Promise<AdapterStatus>
  abstract cancel(taskId: string): void
}
