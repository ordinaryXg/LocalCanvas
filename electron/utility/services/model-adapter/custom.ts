import axios from 'axios'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { ensureDiskSpace } from '../disk-space'
import {
  ModelAdapter,
  type GenerateImageParams,
  type GenerateVideoParams,
  type GenerateTextParams,
  type GenerateAudioParams,
  type AdapterStatus,
} from './base'
import { AdapterError, AdapterErrorCode } from '../../../../src/types/adapter-errors'
import type { CustomAdapterConfig } from '../../../../src/types/config'
import { withRetry } from '../retry-manager'

function extractJsonPath(data: unknown, path?: string): unknown {
  if (!path) return data
  const normalized = path.replace(/^\$\.?/, '')
  const segments = normalized.split(/\.|\[|\]/).filter(Boolean)

  let current: unknown = data
  for (const segment of segments) {
    if (current == null) return undefined
    if (Array.isArray(current)) {
      const index = Number(segment)
      current = Number.isNaN(index) ? undefined : current[index]
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }
  return current
}

export class CustomAdapter extends ModelAdapter {
  private config: CustomAdapterConfig
  private outputDir: string

  constructor(config: CustomAdapterConfig, outputDir: string) {
    super()
    this.config = config
    this.outputDir = outputDir
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    const requestBody = this.buildRequestBody({
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      width: params.width,
      height: params.height,
      steps: params.steps,
      cfg: params.cfg,
      seed: params.seed,
    })
    const response = await this.sendRequest(requestBody)
    if (this.config.poll_config?.enabled) {
      return this.pollForResult(response, 'image', params.taskId)
    }
    const outputUrl = extractJsonPath(response, this.config.response_mapping.output_url)
    if (!outputUrl) {
      throw new AdapterError(
        'No output URL in response',
        'custom',
        AdapterErrorCode.INVALID_PARAMS,
        false,
        '自定义端点响应中未找到输出 URL，请检查 response_mapping 配置',
      )
    }
    return this.downloadFile(String(outputUrl), 'image')
  }

  async generateVideo(params: GenerateVideoParams): Promise<string> {
    const requestBody = this.buildRequestBody({
      prompt: params.prompt,
      first_frame: params.firstFrame,
      last_frame: params.lastFrame,
      duration: params.duration,
      width: params.width,
      height: params.height,
    })
    const response = await this.sendRequest(requestBody)
    if (this.config.poll_config?.enabled) {
      return this.pollForResult(response, 'video', params.taskId)
    }
    const outputUrl = extractJsonPath(response, this.config.response_mapping.output_url)
    if (!outputUrl) {
      throw new AdapterError(
        'No output URL in response',
        'custom',
        AdapterErrorCode.INVALID_PARAMS,
        false,
        '自定义端点响应中未找到输出 URL，请检查 response_mapping 配置',
      )
    }
    return this.downloadFile(String(outputUrl), 'video')
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    const requestBody = this.buildRequestBody({
      prompt: params.prompt,
      system_prompt: params.systemPrompt,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    })
    const response = await this.sendRequest(requestBody)
    const text = extractJsonPath(response, this.config.response_mapping.text)
    return String(text || '')
  }

  async generateAudio(params: GenerateAudioParams): Promise<string> {
    const requestBody = this.buildRequestBody({
      text: params.text,
      voice: params.voice,
    })
    const response = await this.sendRequest(requestBody)
    const outputUrl = extractJsonPath(response, this.config.response_mapping.output_url)
    if (!outputUrl) {
      throw new AdapterError(
        'No output URL in response',
        'custom',
        AdapterErrorCode.INVALID_PARAMS,
        false,
        '自定义端点响应中未找到音频 URL',
      )
    }
    return this.downloadFile(String(outputUrl), 'audio')
  }

  async getStatus(): Promise<AdapterStatus> {
    try {
      await axios.get(this.config.endpoint, {
        headers: this.config.headers,
        timeout: 10000,
      })
      return { available: true, message: '端点可达' }
    } catch (err) {
      throw this.wrapError(err)
    }
  }

  cancel(_taskId: string): void {}

  private buildRequestBody(params: Record<string, unknown>): Record<string, unknown> {
    const template = JSON.parse(JSON.stringify(this.config.request_template)) as Record<string, unknown>

    const replaceVars = (obj: unknown): unknown => {
      if (typeof obj === 'string') {
        return obj.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
          return params[key] !== undefined ? String(params[key]) : `{{${key}}}`
        })
      }
      if (Array.isArray(obj)) return obj.map(replaceVars)
      if (typeof obj === 'object' && obj !== null) {
        const result: Record<string, unknown> = {}
        for (const key of Object.keys(obj)) {
          result[key] = replaceVars((obj as Record<string, unknown>)[key])
        }
        return result
      }
      return obj
    }

    return replaceVars(template) as Record<string, unknown>
  }

  private async sendRequest(body: Record<string, unknown>): Promise<unknown> {
    return withRetry(async () => {
      try {
        const res = await axios({
          method: this.config.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          url: this.config.endpoint,
          data: body,
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers,
          },
          timeout: 120000,
        })
        return res.data
      } catch (err) {
        throw this.wrapError(err)
      }
    })
  }

  private async pollForResult(
    initialResponse: unknown,
    type: 'image' | 'video' | 'audio',
    taskId?: string,
  ): Promise<string> {
    const pollConfig = this.config.poll_config!
    const pollInterval = pollConfig.interval_ms || 2000
    const completionStatus = pollConfig.completion_status || 'succeeded'

    let currentData = initialResponse
    let pollCount = 0
    const maxPolls = 600

    while (pollCount < maxPolls) {
      const status = extractJsonPath(currentData, this.config.response_mapping.status)

      if (status === completionStatus) {
        const outputUrl = extractJsonPath(currentData, this.config.response_mapping.output_url)
        if (!outputUrl) {
          throw new AdapterError(
            'Task completed but no output URL found',
            'custom',
            AdapterErrorCode.INVALID_PARAMS,
            false,
            '任务已完成但未找到输出 URL',
          )
        }
        return this.downloadFile(String(outputUrl), type)
      }

      if (status === 'failed' || status === 'error') {
        throw new AdapterError(
          `Task failed with status: ${String(status)}`,
          'custom',
          AdapterErrorCode.MODEL_ERROR,
          false,
          `自定义端点任务失败：${String(status)}`,
        )
      }

      this.emit('progress', {
        taskId: taskId || `poll-${pollCount}`,
        value: pollCount,
        max: maxPolls,
        percentage: Math.min(95, Math.round((pollCount / maxPolls) * 100)),
      })

      await new Promise((r) => setTimeout(r, pollInterval))
      pollCount++

      if (pollConfig.endpoint) {
        const data = currentData as Record<string, unknown>
        const pollUrl = pollConfig.endpoint.replace('{id}', String(data.id || ''))
        const res = await axios.get(pollUrl, { headers: this.config.headers, timeout: 10000 })
        currentData = res.data
      }
    }

    throw new AdapterError(
      'Polling timeout',
      'custom',
      AdapterErrorCode.CONNECTION_TIMEOUT,
      true,
      '自定义端点轮询超时',
    )
  }

  private async downloadFile(url: string, type: 'image' | 'video' | 'audio'): Promise<string> {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 })
    await mkdir(this.outputDir, { recursive: true })
    const ext = type === 'image' ? 'png' : type === 'video' ? 'mp4' : 'mp3'
    const outputPath = join(this.outputDir, `custom_${Date.now()}.${ext}`)
    ensureDiskSpace(outputPath, res.data.byteLength)
    await writeFile(outputPath, Buffer.from(res.data))
    return outputPath
  }

  private wrapError(err: unknown): AdapterError {
    if (err instanceof AdapterError) return err
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    const message = axios.isAxiosError(err) ? err.message : String(err)

    if (status === 401) {
      return new AdapterError(message, 'custom', AdapterErrorCode.AUTH_FAILED, false, '自定义端点认证失败')
    }
    if (status === 429) {
      return new AdapterError(message, 'custom', AdapterErrorCode.QUOTA_EXCEEDED, true, '自定义端点限流，请稍后重试')
    }
    return new AdapterError(
      message,
      'custom',
      AdapterErrorCode.NETWORK_ERROR,
      true,
      '自定义端点请求失败',
      err instanceof Error ? err : undefined,
    )
  }
}
