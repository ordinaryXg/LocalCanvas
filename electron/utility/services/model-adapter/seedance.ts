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
import {
  AdapterError,
  AdapterErrorCode,
  formatNetworkErrorText,
  isTransientNetworkError,
} from '../../../../src/types/adapter-errors'
import { withRetry } from '../retry-manager'
import {
  SEEDANCE_ENDPOINTS,
  SEEDANCE_CAMERA_PROMPTS,
  isSeedanceV2Model,
  getSeedanceCapabilities,
  type SeedanceRatio,
  type SeedanceResolution,
} from '../../../../src/constants/seedance'
import {
  buildSeedanceContent,
  type SeedanceContentItem,
} from '../../../../src/capabilities/seedance-content'
import { isTaskCancelled, cancelledError } from '../task-cancellation'

export interface SeedanceAdapterOptions {
  apiKey: string
  model: string
  outputDir: string
  createEndpoint?: string
  pollEndpoint?: string
  defaultParams?: Record<string, unknown>
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
    const resolution = (params.resolution ??
      this.defaultParams.resolution ??
      (isSeedanceV2Model(this.model) ? '1080p' : '720p')) as SeedanceResolution
    const generateAudio = caps.supportsGenerateAudio
      ? (params.generateAudio ?? this.defaultParams.generate_audio ?? true)
      : false
    const watermark = this.defaultParams.watermark ?? false

    const promptText = this.buildPrompt(params.prompt, params.camera)
    const isV2 = isSeedanceV2Model(this.model)
    const content = buildSeedanceContent({
      promptText,
      isV2,
      firstFrame: params.firstFrame
        ? await this.resolveMediaRef(params.firstFrame)
        : undefined,
      lastFrame:
        caps.supportsLastFrame && params.lastFrame
          ? await this.resolveMediaRef(params.lastFrame)
          : undefined,
      referenceImages:
        isV2 && params.referenceImages?.length
          ? await Promise.all(params.referenceImages.map((r) => this.resolveMediaRef(r)))
          : undefined,
      referenceVideo:
        isV2 && params.referenceVideo
          ? await this.resolveMediaRef(params.referenceVideo)
          : undefined,
      referenceAudio:
        isV2 && params.referenceAudio
          ? await this.resolveMediaRef(params.referenceAudio)
          : undefined,
    })

    const ratio = this.resolveRatio(params, content)

    const body: Record<string, unknown> = {
      model: this.model,
      content,
      ratio,
      resolution,
      duration: Math.min(Math.max(params.duration, caps.minDuration), caps.maxDuration),
    }

    if (isSeedanceV2Model(this.model)) {
      body.generate_audio = generateAudio
      body.watermark = watermark
    }

    let arkTaskId = params.seedanceArkTaskId
    if (!arkTaskId) {
      arkTaskId = await this.createArkTask(body)
      this.emit('checkpoint', {
        seedanceArkTaskId: arkTaskId,
        nodeId: params.nodeId,
      })
    }

    return this.pollUntilDone(arkTaskId, params.nodeId, params.taskId)
  }

  private async createArkTask(body: Record<string, unknown>): Promise<string> {
    try {
      const res = await axios.post(this.createEndpoint, body, {
        headers: this.headers,
        timeout: 120_000,
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
      return taskId
    } catch (err) {
      if (err instanceof AdapterError) throw err
      throw this.wrapError(err, 'create')
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

  private resolveRatio(
    params: GenerateVideoParams,
    content: SeedanceContentItem[],
  ): SeedanceRatio {
    const hasImage = content.some((item) => item.type === 'image_url')
    if (hasImage) return 'adaptive'

    let ratio = (params.ratio ?? this.defaultParams.ratio ?? '16:9') as SeedanceRatio
    if (ratio === 'adaptive') ratio = '16:9'

    const allowed: SeedanceRatio[] = ['16:9', '9:16', '4:3', '3:4', '21:9', '1:1']
    if (!allowed.includes(ratio)) ratio = '16:9'

    return ratio
  }

  private buildPrompt(prompt: string, camera?: string): string {
    const cameraHint = camera ? SEEDANCE_CAMERA_PROMPTS[camera] : undefined
    if (!cameraHint) return prompt
    return `${prompt}. Camera: ${cameraHint}.`
  }

  private async resolveMediaRef(ref: string): Promise<string> {
    if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('data:')) {
      return ref
    }
    if (ref.startsWith('blob:')) {
      throw new AdapterError(
        'Blob URLs not supported in utility process',
        'openai',
        AdapterErrorCode.INVALID_PARAMS,
        false,
        '请使用已保存到项目的媒体节点（重新上传后重试）',
      )
    }
    const filePath = ref.startsWith('file:') ? fileURLToPath(ref) : ref
    try {
      const buf = await readFile(filePath)
      const ext = filePath.split('.').pop()?.toLowerCase() ?? 'bin'
      const mime = this.mimeFromExt(ext)
      return `data:${mime};base64,${buf.toString('base64')}`
    } catch {
      throw new AdapterError(
        `Cannot read media: ${ref}`,
        'openai',
        AdapterErrorCode.INVALID_PARAMS,
        false,
        '无法读取参考媒体文件',
      )
    }
  }

  private mimeFromExt(ext: string): string {
    const map: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
    }
    return map[ext] ?? `application/${ext}`
  }

  private async pollUntilDone(
    taskId: string,
    nodeId?: string,
    clientTaskId?: string,
  ): Promise<string> {
    const pollUrl = this.pollEndpoint.replace('{task_id}', taskId)
    let waitMs = 5000
    const maxAttempts = 60

    for (let i = 0; i < maxAttempts; i++) {
      if (clientTaskId && isTaskCancelled(clientTaskId)) {
        throw cancelledError()
      }

      let res: Awaited<ReturnType<typeof axios.get>>
      try {
        res = await axios.get(pollUrl, { headers: this.headers, timeout: 30_000 })
      } catch (err) {
        if (isTransientNetworkError(err) && i < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, waitMs))
          waitMs = Math.min(waitMs * 1.5, 15_000)
          continue
        }
        throw this.wrapError(err, 'poll')
      }
      const status = (res.data.status as string) || ''

      this.emit('progress', {
        taskId: clientTaskId ?? taskId,
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
        const compliance = this.isSeedanceComplianceError(errMsg)
        throw new AdapterError(
          errMsg,
          'openai',
          compliance ? AdapterErrorCode.INVALID_PARAMS : AdapterErrorCode.MODEL_ERROR,
          !compliance && status !== 'cancelled',
          this.mapSeedanceUserMessage(errMsg, 'Seedance 生成失败：'),
        )
      }

      await new Promise((r) => setTimeout(r, waitMs))
      waitMs = Math.min(waitMs * 1.5, 15000)
      if (clientTaskId && isTaskCancelled(clientTaskId)) {
        throw cancelledError()
      }
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
    try {
      await withRetry(
        async () => {
          const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 300_000 })
          await writeFile(localPath, Buffer.from(res.data))
        },
        { maxRetries: 2, baseDelay: 2000 },
      )
    } catch (err) {
      if (err instanceof AdapterError) throw err
      throw this.wrapError(err, 'download')
    }
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

  private isSeedanceComplianceError(detail: string): boolean {
    const lower = detail.toLowerCase()
    return lower.includes('real person') || detail.includes('真人')
  }

  private mapSeedanceUserMessage(detail: string, prefix?: string): string {
    const lower = detail.toLowerCase()
    if (lower.includes('real person') || detail.includes('真人')) {
      return (
        '输入图片可能包含真人照片，Seedance 默认拒绝此类素材。' +
        '请改用 AI 生成图/插画、移除首帧/参考图中的真人照片，' +
        '或在火山方舟开通「真人过白」并使用可公网访问的 URL 素材'
      )
    }
    if (lower.includes('only url inputs are supported') || lower.includes('only url')) {
      return '该能力仅支持 http(s) 公网 URL 素材，不支持 Base64。请换用 URL 或去掉相关参考图/视频'
    }
    const trimmed = detail.length > 120 ? `${detail.slice(0, 120)}…` : detail
    return prefix ? `${prefix}${trimmed}` : trimmed
  }

  private wrapError(
    err: unknown,
    phase: 'create' | 'poll' | 'download' = 'poll',
  ): AdapterError {
    const message = err instanceof Error ? err.message : String(err)
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    const { code, message: apiMessage } = this.extractVolcengineError(err)
    const detail = apiMessage || message

    if (isTransientNetworkError(err)) {
      const billingHint =
        phase === 'create'
          ? ' 若火山方舟控制台显示本次请求已成功并扣费，请勿重复点击生成，可稍后重试同一节点。'
          : ''
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.CONNECTION_TIMEOUT,
        phase !== 'create',
        formatNetworkErrorText(detail) + billingHint,
        err instanceof Error ? err : undefined,
      )
    }

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
    if (
      detail.includes('比例') ||
      detail.toLowerCase().includes('ratio') ||
      detail.toLowerCase().includes('aspect')
    ) {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.INVALID_PARAMS,
        false,
        '视频比例参数无效：文生视频请使用 16:9 / 9:16 等固定比例；连接首帧/尾帧时会自动使用 adaptive',
        err instanceof Error ? err : undefined,
      )
    }

    if (this.isSeedanceComplianceError(detail)) {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.INVALID_PARAMS,
        false,
        this.mapSeedanceUserMessage(detail),
        err instanceof Error ? err : undefined,
      )
    }

    return new AdapterError(
      detail,
      'openai',
      AdapterErrorCode.MODEL_ERROR,
      true,
      this.mapSeedanceUserMessage(detail),
      err instanceof Error ? err : undefined,
    )
  }
}
