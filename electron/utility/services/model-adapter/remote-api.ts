import axios from 'axios'
import type { TextGenerateResult } from '../../../../src/utils/textGenerateResult'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import {
  ModelAdapter,
  type GenerateImageParams,
  type GenerateVideoParams,
  type GenerateTextParams,
  type GenerateAudioParams,
  type AdapterStatus,
} from './base'
import { AdapterError, AdapterErrorCode, ADAPTER_USER_MESSAGES } from '../../../../src/types/adapter-errors'
import { isSeedreamModel, mapSizeForSeedream } from '../../../../src/constants/seedream'
import { resolveProfile } from '../../../../src/capabilities/registry'
import {
  buildReasoningParams,
  shouldForceStream,
} from '../../../../src/capabilities/reasoning-params'
import { buildVisionUserContent } from '../../../../src/capabilities/llm-vision-content'

function mergeTextRequestBody(
  base: Record<string, unknown>,
  reasoning: Record<string, unknown>,
): Record<string, unknown> {
  const baseExtra = (base.extra_body as Record<string, unknown> | undefined) ?? {}
  const reasoningExtra = (reasoning.extra_body as Record<string, unknown> | undefined) ?? {}
  const { extra_body: _rExtra, ...reasoningRest } = reasoning
  const mergedExtra = { ...baseExtra, ...reasoningExtra }
  return {
    ...base,
    ...reasoningRest,
    ...(Object.keys(mergedExtra).length > 0 ? { extra_body: mergedExtra } : {}),
  }
}
import { isTaskCancelled, cancelledError } from '../task-cancellation'

export interface RemoteApiAdapterOptions {
  endpoint: string
  apiKey: string
  model: string
  outputDir: string
  pollEndpoint?: string
}

/** 统一远端 API 适配器：文本 / 图像 / 视频 / 音频均走 HTTP API */
export class RemoteApiAdapter extends ModelAdapter {
  private endpoint: string
  private apiKey: string
  private model: string
  private outputDir: string
  private pollEndpoint?: string

  constructor(options: RemoteApiAdapterOptions) {
    super()
    this.endpoint = options.endpoint
    this.apiKey = options.apiKey
    this.model = options.model
    this.outputDir = options.outputDir
    this.pollEndpoint = options.pollEndpoint
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    return this.withRetry(async () => {
      const referenceUrls =
        params.referenceImages?.filter(Boolean) ??
        (params.referenceImage ? [params.referenceImage] : undefined)

      const body = isSeedreamModel(this.model)
        ? {
            model: this.model,
            prompt: params.prompt,
            size: mapSizeForSeedream(params.width, params.height, this.model),
            response_format: 'url',
            watermark: false,
            sequential_image_generation: 'disabled',
            ...(referenceUrls?.length ? { image: referenceUrls } : {}),
          }
        : {
            model: this.model,
            input: { prompt: params.prompt },
            prompt: params.prompt,
            negative_prompt: params.negativePrompt,
            n: params.batchSize || 1,
            size: `${params.width}x${params.height}`,
          }

      const res = await axios.post(this.endpoint, body, {
        headers: this.headers,
        timeout: 300000,
      })

      const taskId = this.extractTaskId(res.data)
      if (taskId && this.pollEndpoint) {
        return this.pollTask(taskId, params.nodeId, '.png', params.taskId)
      }

      const url = this.extractMediaUrl(res.data)
      return this.downloadToLocal(url, '.png')
    })
  }

  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn()
      } catch (err) {
        if (err instanceof AdapterError) {
          lastError = err
          if (!err.retryable || attempt === maxRetries - 1) throw err
        } else {
          const wrapped = this.wrapError(err)
          lastError = wrapped
          if (!wrapped.retryable || attempt === maxRetries - 1) throw wrapped
        }
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
      }
    }
    throw lastError
  }

  async generateVideo(params: GenerateVideoParams): Promise<string> {
    try {
      const body: Record<string, unknown> = {
        model: this.model,
        input: {
          prompt: params.prompt,
          duration: params.duration,
        },
        prompt: params.prompt,
        duration: params.duration,
        size: `${params.width}x${params.height}`,
      }
      if (params.firstFrame) {
        body.image_url = params.firstFrame
        ;(body.input as Record<string, unknown>).image_url = params.firstFrame
      }

      const res = await axios.post(this.endpoint, body, {
        headers: this.headers,
        timeout: 300000,
      })

      const taskId = this.extractTaskId(res.data)
      if (taskId && this.pollEndpoint) {
        return this.pollTask(taskId, params.nodeId, '.mp4', params.taskId)
      }

      const url = this.extractMediaUrl(res.data)
      return this.downloadToLocal(url, '.mp4')
    } catch (err) {
      if (err instanceof AdapterError) throw err
      throw this.wrapError(err)
    }
  }

  async generateText(params: GenerateTextParams): Promise<TextGenerateResult> {
    try {
      const profile = resolveProfile({ model: this.model, kind: 'llm' })
      const preset = params.thinkingPreset ?? 'balanced'
      const reasoning = buildReasoningParams(profile, preset)
      const userContent = buildVisionUserContent(params.prompt, params.images)
      const body = mergeTextRequestBody(
        {
          model: this.model,
          messages: [
            ...(params.systemPrompt
              ? [{ role: 'system' as const, content: params.systemPrompt }]
              : []),
            { role: 'user' as const, content: userContent },
          ],
          max_tokens: params.maxTokens || 4096,
          temperature: params.temperature ?? 0.7,
          stream: params.stream ?? shouldForceStream(profile, preset),
        },
        reasoning,
      )

      const res = await axios.post(this.endpoint, body, {
        headers: this.headers,
        timeout: 120000,
      })

      const message = res.data.choices?.[0]?.message as Record<string, unknown> | undefined
      const content = (message?.content as string) || ''
      const outputField = profile.reasoning?.output_field ?? 'reasoning_content'
      const reasoningRaw = message?.[outputField]
      const reasoningContent =
        typeof reasoningRaw === 'string' && reasoningRaw.trim() ? reasoningRaw : undefined
      if (reasoningContent) return { content, reasoningContent }
      return content
    } catch (err) {
      throw this.wrapError(err)
    }
  }

  async generateAudio(params: GenerateAudioParams): Promise<string> {
    try {
      const res = await axios.post(
        this.endpoint,
        {
          model: this.model,
          input: { text: params.text, voice: params.voice },
          text: params.text,
          voice: params.voice,
        },
        { headers: this.headers, timeout: 120000, responseType: 'arraybuffer' },
      )

      const contentType = res.headers['content-type'] as string | undefined
      if (contentType?.includes('audio') || contentType?.includes('octet-stream')) {
        await mkdir(this.outputDir, { recursive: true })
        const localPath = join(this.outputDir, `${Date.now()}.mp3`)
        await writeFile(localPath, Buffer.from(res.data))
        return localPath
      }

      const json = JSON.parse(Buffer.from(res.data).toString()) as Record<string, unknown>
      const taskId = this.extractTaskId(json)
      if (taskId && this.pollEndpoint) {
        return this.pollTask(taskId, params.nodeId, '.mp3', params.taskId)
      }

      const url = this.extractMediaUrl(json)
      return this.downloadToLocal(url, '.mp3')
    } catch (err) {
      if (err instanceof AdapterError) throw err
      throw this.wrapError(err)
    }
  }

  async getStatus(): Promise<AdapterStatus> {
    try {
      const modelsUrl = this.endpoint.replace(
        /\/(chat\/completions|images\/generations|video-synthesis|text2speech\/synthesis).*/,
        '/models',
      )
      await axios.get(modelsUrl, { headers: this.headers, timeout: 10000 })
      return { available: true, message: 'API 在线' }
    } catch {
      return { available: false, message: 'API 不可达，请检查 Key 与网络' }
    }
  }

  cancel(_taskId: string): void {
    // 多数云端 API 不支持客户端取消
  }

  private extractTaskId(data: Record<string, unknown>): string | undefined {
    const output = data.output as Record<string, unknown> | undefined
    return (
      (data.task_id as string) ||
      (output?.task_id as string) ||
      (data.id as string) ||
      undefined
    )
  }

  private extractMediaUrl(data: Record<string, unknown>): string {
    const output = data.output as Record<string, unknown> | undefined
    const results = output?.results as Array<Record<string, unknown>> | undefined
    const dataArr = data.data as Array<Record<string, unknown>> | undefined

    const candidates = [
      data.url,
      output?.url,
      output?.video_url,
      output?.audio_url,
      results?.[0]?.url,
      dataArr?.[0]?.url,
      dataArr?.[0]?.b64_json,
    ]

    for (const c of candidates) {
      if (typeof c === 'string' && c.length > 0) return c
    }

    throw new AdapterError(
      'No media URL in API response',
      'openai',
      AdapterErrorCode.MODEL_ERROR,
      false,
      'API 未返回媒体地址',
    )
  }

  private async pollTask(
    taskId: string,
    nodeId: string | undefined,
    ext: string,
    clientTaskId?: string,
  ): Promise<string> {
    const pollUrl = (this.pollEndpoint || '').replace('{task_id}', taskId)
    if (!pollUrl) {
      throw new AdapterError(
        'Task polling endpoint not configured',
        'openai',
        AdapterErrorCode.INVALID_PARAMS,
        false,
        '未配置任务轮询地址',
      )
    }

    const maxAttempts = 120
    for (let i = 0; i < maxAttempts; i++) {
      if (clientTaskId && isTaskCancelled(clientTaskId)) {
        throw cancelledError()
      }

      const res = await axios.get(pollUrl, { headers: this.headers, timeout: 30000 })
      const status =
        (res.data.output?.task_status as string) ||
        (res.data.status as string) ||
        ''

      this.emit('progress', {
        taskId,
        nodeId,
        value: i + 1,
        max: maxAttempts,
        percentage: Math.min(99, Math.round(((i + 1) / maxAttempts) * 100)),
      })

      if (status === 'SUCCEEDED' || status === 'succeeded' || status === 'completed') {
        const url = this.extractMediaUrl(res.data)
        return this.downloadToLocal(url, ext)
      }
      if (status === 'FAILED' || status === 'failed') {
        throw new AdapterError(
          'Remote task failed',
          'openai',
          AdapterErrorCode.MODEL_ERROR,
          true,
          '远端生成任务失败',
        )
      }

      await new Promise((r) => setTimeout(r, 3000))
      if (clientTaskId && isTaskCancelled(clientTaskId)) {
        throw cancelledError()
      }
    }

    throw new AdapterError(
      'Task polling timeout',
      'openai',
      AdapterErrorCode.CONNECTION_TIMEOUT,
      true,
      '生成超时，请稍后重试',
    )
  }

  private async downloadToLocal(urlOrBase64: string, ext: string): Promise<string> {
    await mkdir(this.outputDir, { recursive: true })
    const localPath = join(this.outputDir, `${Date.now()}${ext}`)

    if (urlOrBase64.startsWith('http')) {
      const res = await axios.get(urlOrBase64, { responseType: 'arraybuffer', timeout: 120000 })
      await writeFile(localPath, Buffer.from(res.data))
    } else {
      await writeFile(localPath, Buffer.from(urlOrBase64, 'base64'))
    }

    return localPath
  }

  private extractApiErrorMessage(err: unknown): { message?: string; code?: string } {
    if (!axios.isAxiosError(err)) return {}
    const data = err.response?.data as Record<string, unknown> | undefined
    if (!data) return {}
    const errObj = data.error as Record<string, unknown> | undefined
    return {
      message:
        (errObj?.message as string) ||
        (data.message as string) ||
        (data.msg as string) ||
        undefined,
      code: (data.code as string) || (errObj?.code as string) || undefined,
    }
  }

  private wrapError(err: unknown): AdapterError {
    const message = err instanceof Error ? err.message : String(err)
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    const netCode = axios.isAxiosError(err) ? err.code : undefined
    const { message: apiMsg, code } = this.extractApiErrorMessage(err)
    const detail = apiMsg || message

    if (
      netCode === 'ETIMEDOUT' ||
      netCode === 'ECONNABORTED' ||
      detail.includes('ETIMEDOUT')
    ) {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.CONNECTION_TIMEOUT,
        true,
        '连接火山方舟超时，请检查网络、代理/VPN 或防火墙后重试',
        err instanceof Error ? err : undefined,
      )
    }
    if (
      netCode === 'ECONNREFUSED' ||
      netCode === 'ENOTFOUND' ||
      netCode === 'EAI_AGAIN' ||
      detail.includes('ECONNREFUSED')
    ) {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.CONNECTION_REFUSED,
        true,
        '无法连接火山方舟 API（ark.cn-beijing.volces.com），请检查网络',
        err instanceof Error ? err : undefined,
      )
    }
    if (netCode === 'ECONNRESET') {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.NETWORK_ERROR,
        true,
        '网络连接中断，请重试',
        err instanceof Error ? err : undefined,
      )
    }

    if (status === 401 || status === 403) {
      const userMessage =
        detail.includes('API key format') || detail.includes('api key format')
          ? 'API Key 格式不正确，请在设置中填写火山方舟 API Key（console.volcengine.com），不要使用 OpenAI 的 sk- 密钥'
          : detail || ADAPTER_USER_MESSAGES[AdapterErrorCode.AUTH_FAILED]
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.AUTH_FAILED,
        false,
        userMessage,
        err instanceof Error ? err : undefined,
      )
    }
    if (status === 402) {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.QUOTA_EXCEEDED,
        false,
        detail || 'API 账户余额不足，请前往服务商控制台充值后重试',
        err instanceof Error ? err : undefined,
      )
    }
    if (status === 429) {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.QUOTA_EXCEEDED,
        true,
        detail || ADAPTER_USER_MESSAGES[AdapterErrorCode.QUOTA_EXCEEDED],
        err instanceof Error ? err : undefined,
      )
    }
    if (
      code === 'ModelNotOpen' ||
      detail.includes('has not activated the model') ||
      detail.includes('ModelNotOpen')
    ) {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.MODEL_NOT_FOUND,
        false,
        `尚未开通图像模型「${this.model}」，请前往火山方舟控制台 → 模型推理开通后再试`,
        err instanceof Error ? err : undefined,
      )
    }
    if (status === 404) {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.MODEL_NOT_FOUND,
        false,
        '图像模型不存在或未开通，请检查 API Model ID 是否与控制台一致',
        err instanceof Error ? err : undefined,
      )
    }
    if (
      detail.includes('parameter `size`') ||
      detail.includes('image size must be at least')
    ) {
      return new AdapterError(
        detail,
        'openai',
        AdapterErrorCode.INVALID_PARAMS,
        false,
        '图像尺寸过小：Seedream 4.5 至少需要 2560×1440 像素，请使用 16:9 或选择 2K 档位',
        err instanceof Error ? err : undefined,
      )
    }

    return new AdapterError(
      message,
      'openai',
      AdapterErrorCode.NETWORK_ERROR,
      true,
      detail.length > 160 ? `${detail.slice(0, 160)}…` : detail,
      err instanceof Error ? err : undefined,
    )
  }
}
