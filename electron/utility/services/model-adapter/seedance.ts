import axios from 'axios'
import { readFile } from 'fs/promises'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import {
  ModelAdapter,
  type GenerateImageParams,
  type GenerateVideoParams,
  type GenerateTextParams,
  type GenerateAudioParams,
  type AdapterStatus,
} from './base'
import { AdapterError, AdapterErrorCode } from '../../../../src/types/adapter-errors'
import {
  SEEDANCE_ENDPOINTS,
  SEEDANCE_CAMERA_PROMPTS,
  isSeedanceV2Model,
  getSeedanceCapabilities,
  type SeedanceRatio,
  type SeedanceResolution,
} from '../../../../src/constants/seedance'

export interface SeedanceAdapterOptions {
  apiKey: string
  model: string
  outputDir: string
  createEndpoint?: string
  pollEndpoint?: string
  defaultParams?: Record<string, unknown>
}

interface SeedanceContentItem {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

/**
 * 火山方舟 Doubao Seedance 2.0 视频生成适配器
 * @see https://www.volcengine.com/docs/82379/2291680
 * @see https://www.volcengine.com/docs/82379/1520757
 */
export class SeedanceAdapter extends ModelAdapter {
  private apiKey: string
  private model: string
  private outputDir: string
  private createEndpoint: string
  private pollEndpoint: string
  private defaultParams: Record<string, unknown>

  constructor(options: SeedanceAdapterOptions) {
    super()
    this.apiKey = options.apiKey
    this.model = options.model
    this.outputDir = options.outputDir
    this.createEndpoint = options.createEndpoint ?? SEEDANCE_ENDPOINTS.createTask
    this.pollEndpoint = options.pollEndpoint ?? SEEDANCE_ENDPOINTS.pollTask
    this.defaultParams = options.defaultParams ?? {}
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  async generateVideo(params: GenerateVideoParams): Promise<string> {
    if (!this.apiKey.trim()) {
      throw new AdapterError(
        'ARK API Key not configured',
        'openai',
        AdapterErrorCode.AUTH_FAILED,
        false,
        '请先在模型配置中填写火山方舟 ARK API Key',
      )
    }

    const caps = getSeedanceCapabilities(this.model)
    const ratio = (params.ratio ?? this.defaultParams.ratio ?? '16:9') as SeedanceRatio
    const resolution = (params.resolution ??
      this.defaultParams.resolution ??
      '1080p') as SeedanceResolution
    const generateAudio = caps.supportsGenerateAudio
      ? (params.generateAudio ?? this.defaultParams.generate_audio ?? true)
      : false
    const watermark = this.defaultParams.watermark ?? false

    const promptText = this.buildPrompt(params.prompt, params.camera)
    const content: SeedanceContentItem[] = [{ type: 'text', text: promptText }]

    if (params.firstFrame) {
      content.push({
        type: 'image_url',
        image_url: { url: await this.resolveImageRef(params.firstFrame) },
      })
    }
    if (caps.supportsLastFrame && params.lastFrame) {
      content.push({
        type: 'image_url',
        image_url: { url: await this.resolveImageRef(params.lastFrame) },
      })
    }

    const body: Record<string, unknown> = {
      model: this.model,
      content,
      ratio: params.firstFrame || params.lastFrame ? 'adaptive' : ratio,
      resolution,
      duration: Math.min(Math.max(params.duration, caps.minDuration), caps.maxDuration),
    }

    if (isSeedanceV2Model(this.model)) {
      body.generate_audio = generateAudio
      body.watermark = watermark
    }

    try {
      const res = await axios.post(this.createEndpoint, body, {
        headers: this.headers,
        timeout: 60000,
      })

      const taskId = (res.data.id as string) || (res.data.task_id as string)
      if (!taskId) {
        throw new AdapterError(
          'No task id in Seedance response',
          'openai',
          AdapterErrorCode.MODEL_ERROR,
          false,
          'Seedance 未返回任务 ID',
        )
      }

      return this.pollUntilDone(taskId, params.nodeId)
    } catch (err) {
      if (err instanceof AdapterError) throw err
      throw this.wrapError(err)
    }
  }

  async generateImage(_params: GenerateImageParams): Promise<string> {
    throw this.unsupported('图像生成')
  }

  async generateText(_params: GenerateTextParams): Promise<string> {
    throw this.unsupported('文本生成')
  }

  async generateAudio(_params: GenerateAudioParams): Promise<string> {
    throw this.unsupported('音频生成')
  }

  async getStatus(): Promise<AdapterStatus> {
    try {
      await axios.get(SEEDANCE_ENDPOINTS.models, { headers: this.headers, timeout: 10000 })
      return { available: true, message: 'Seedance API 在线' }
    } catch {
      return { available: false, message: 'Seedance API 不可达，请检查 ARK API Key' }
    }
  }

  cancel(_taskId: string): void {
    // Seedance 暂不支持客户端取消
  }

  private buildPrompt(prompt: string, camera?: string): string {
    const cameraHint = camera ? SEEDANCE_CAMERA_PROMPTS[camera] : undefined
    if (!cameraHint) return prompt
    return `${prompt}. Camera: ${cameraHint}.`
  }

  private async resolveImageRef(ref: string): Promise<string> {
    if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('data:')) {
      return ref
    }
    if (ref.startsWith('blob:')) {
      throw new AdapterError(
        'Blob URLs not supported in utility process',
        'openai',
        AdapterErrorCode.INVALID_PARAMS,
        false,
        '首帧/尾帧请使用已保存的图片节点（重新上传后重试）',
      )
    }
    const filePath = ref.startsWith('file:') ? fileURLToPath(ref) : ref
    try {
      const buf = await readFile(filePath)
      const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png'
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
      return `data:${mime};base64,${buf.toString('base64')}`
    } catch {
      throw new AdapterError(
        `Cannot read image: ${ref}`,
        'openai',
        AdapterErrorCode.INVALID_PARAMS,
        false,
        '无法读取首帧/尾帧图片文件',
      )
    }
  }

  private async pollUntilDone(taskId: string, nodeId?: string): Promise<string> {
    const pollUrl = this.pollEndpoint.replace('{task_id}', taskId)
    let waitMs = 5000
    const maxAttempts = 60

    for (let i = 0; i < maxAttempts; i++) {
      const res = await axios.get(pollUrl, { headers: this.headers, timeout: 30000 })
      const status = (res.data.status as string) || ''

      this.emit('progress', {
        taskId,
        nodeId,
        value: i + 1,
        max: maxAttempts,
        percentage: Math.min(
          99,
          status === 'running' ? 30 + i * 2 : status === 'queued' ? 10 + i : 5 + i,
        ),
      })

      if (status === 'succeeded') {
        const videoUrl =
          (res.data.content?.video_url as string) ||
          (res.data.output?.video_url as string) ||
          (res.data.video_url as string)

        if (!videoUrl) {
          throw new AdapterError(
            'No video_url in succeeded response',
            'openai',
            AdapterErrorCode.MODEL_ERROR,
            false,
            'Seedance 任务成功但未返回视频地址',
          )
        }

        return this.downloadVideo(videoUrl)
      }

      if (status === 'failed' || status === 'expired' || status === 'cancelled') {
        const errMsg =
          (res.data.error?.message as string) ||
          (res.data.message as string) ||
          `任务状态: ${status}`
        throw new AdapterError(
          errMsg,
          'openai',
          AdapterErrorCode.MODEL_ERROR,
          status !== 'cancelled',
          `Seedance 生成失败：${errMsg}`,
        )
      }

      await new Promise((r) => setTimeout(r, waitMs))
      waitMs = Math.min(waitMs * 1.5, 15000)
    }

    throw new AdapterError(
      'Seedance poll timeout',
      'openai',
      AdapterErrorCode.CONNECTION_TIMEOUT,
      true,
      'Seedance 生成超时，请稍后重试',
    )
  }

  private async downloadVideo(url: string): Promise<string> {
    await mkdir(this.outputDir, { recursive: true })
    const localPath = join(this.outputDir, `${Date.now()}-seedance.mp4`)
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 300000 })
    await writeFile(localPath, Buffer.from(res.data))
    return localPath
  }

  private unsupported(op: string): AdapterError {
    return new AdapterError(
      `Seedance adapter does not support ${op}`,
      'openai',
      AdapterErrorCode.UNSUPPORTED_OPERATION,
      false,
      `Seedance 适配器仅支持视频生成`,
    )
  }

  private extractVolcengineError(err: unknown): { code?: string; message?: string } {
    if (!axios.isAxiosError(err)) return {}
    const body = err.response?.data as Record<string, unknown> | undefined
    if (!body) return {}

    if (typeof body.message === 'string') {
      return {
        code: typeof body.code === 'string' ? body.code : undefined,
        message: body.message,
      }
    }

    const nested = body.error as Record<string, unknown> | undefined
    if (nested && typeof nested.message === 'string') {
      return {
        code: typeof nested.code === 'string' ? nested.code : undefined,
        message: nested.message,
      }
    }

    return {}
  }

  private wrapError(err: unknown): AdapterError {
    const message = err instanceof Error ? err.message : String(err)
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    const { code, message: apiMessage } = this.extractVolcengineError(err)
    const detail = apiMessage || message

    if (status === 401 || status === 403) {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.AUTH_FAILED,
        false,
        'ARK API Key 无效，请在火山方舟控制台获取',
        err instanceof Error ? err : undefined,
      )
    }
    if (status === 402) {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.QUOTA_EXCEEDED,
        false,
        '火山方舟账户余额不足，请充值后重试',
        err instanceof Error ? err : undefined,
      )
    }
    if (status === 429) {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.QUOTA_EXCEEDED,
        true,
        'Seedance 配额已用尽，请稍后重试',
        err instanceof Error ? err : undefined,
      )
    }
    if (code === 'ModelNotOpen' || detail.includes('has not activated the model')) {
      const hint = isSeedanceV2Model(this.model)
        ? 'doubao-seedance-2-0'
        : 'doubao-seedance-1-0-pro-fast'
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.MODEL_NOT_FOUND,
        false,
        `尚未开通该 Seedance 模型，请前往火山方舟控制台 → 模型推理，开通 ${hint} 后再试`,
        err instanceof Error ? err : undefined,
      )
    }
    if (status === 404 || code === 'NotFound') {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.MODEL_NOT_FOUND,
        false,
        'Seedance 模型不存在或未开通，请检查方舟控制台中的模型 ID',
        err instanceof Error ? err : undefined,
      )
    }

    return new AdapterError(
      detail,
      'openai',
      AdapterErrorCode.MODEL_ERROR,
      true,
      detail.length > 120 ? `${detail.slice(0, 120)}…` : detail,
      err instanceof Error ? err : undefined,
    )
  }
}
