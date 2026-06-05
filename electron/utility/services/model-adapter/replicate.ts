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
import { withRetry } from '../retry-manager'

export class ReplicateAdapter extends ModelAdapter {
  private apiToken: string
  private outputDir: string
  private apiBase = 'https://api.replicate.com/v1'
  private pollInterval = 2000

  constructor(apiToken: string, outputDir: string) {
    super()
    this.apiToken = apiToken
    this.outputDir = outputDir
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    const prediction = await this.createPrediction({
      model: params.model,
      input: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        width: params.width,
        height: params.height,
        num_outputs: params.batchSize || 1,
        num_inference_steps: params.steps || 28,
        guidance_scale: params.cfg || 7.5,
      },
    })
    const result = await this.pollUntilComplete(prediction.id, params.taskId)
    const output = Array.isArray(result.output) ? result.output[0] : result.output
    return this.downloadOutput(String(output), 'image')
  }

  async generateVideo(params: GenerateVideoParams): Promise<string> {
    const prediction = await this.createPrediction({
      model: params.model,
      input: {
        prompt: params.prompt,
        first_frame: params.firstFrame,
        last_frame: params.lastFrame,
        duration: params.duration,
      },
    })
    const result = await this.pollUntilComplete(prediction.id, params.taskId)
    const output = Array.isArray(result.output) ? result.output[0] : result.output
    return this.downloadOutput(String(output), 'video')
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    const prediction = await this.createPrediction({
      model: params.model,
      input: {
        prompt: params.prompt,
        max_tokens: params.maxTokens || 4096,
        temperature: params.temperature || 0.7,
      },
    })
    const result = await this.pollUntilComplete(prediction.id, params.taskId)
    return Array.isArray(result.output) ? result.output.join('') : String(result.output)
  }

  async generateAudio(_params: GenerateAudioParams): Promise<string> {
    throw new AdapterError(
      'Replicate adapter does not support audio',
      'custom',
      AdapterErrorCode.UNSUPPORTED_OPERATION,
      false,
      'Replicate 适配器暂不支持音频生成',
    )
  }

  async getStatus(): Promise<AdapterStatus> {
    try {
      await axios.get(`${this.apiBase}/predictions?limit=1`, {
        headers: { Authorization: `Token ${this.apiToken}` },
        timeout: 10000,
      })
      return { available: true, message: 'Replicate API 在线' }
    } catch (err) {
      throw this.wrapError(err)
    }
  }

  cancel(_taskId: string): void {}

  private async createPrediction(params: { model: string; input: Record<string, unknown> }): Promise<{ id: string }> {
    return withRetry(async () => {
      try {
        const res = await axios.post(
          `${this.apiBase}/predictions`,
          { model: params.model, input: params.input },
          {
            headers: {
              Authorization: `Token ${this.apiToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          },
        )
        return res.data as { id: string }
      } catch (err) {
        throw this.wrapError(err)
      }
    })
  }

  private async pollUntilComplete(predictionId: string, taskId?: string): Promise<{ output: unknown }> {
    while (true) {
      const res = await axios.get(`${this.apiBase}/predictions/${predictionId}`, {
        headers: { Authorization: `Token ${this.apiToken}` },
        timeout: 10000,
      })

      const { status, output, error } = res.data as {
        status: string
        output: unknown
        error?: string
      }

      if (status === 'succeeded') return { output }
      if (status === 'failed' || status === 'canceled') {
        throw new AdapterError(
          `Prediction ${status}: ${predictionId}`,
          'custom',
          AdapterErrorCode.MODEL_ERROR,
          false,
          `Replicate 生成失败：${error || status}`,
        )
      }

      this.emit('progress', {
        taskId: taskId || predictionId,
        value: status === 'processing' ? 50 : 10,
        max: 100,
        percentage: status === 'processing' ? 50 : 10,
      })

      await new Promise((r) => setTimeout(r, this.pollInterval))
    }
  }

  private async downloadOutput(url: string, type: 'image' | 'video'): Promise<string> {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 })
    await mkdir(this.outputDir, { recursive: true })
    const ext = type === 'image' ? 'png' : 'mp4'
    const outputPath = join(this.outputDir, `replicate_${Date.now()}.${ext}`)
    ensureDiskSpace(outputPath, res.data.byteLength)
    await writeFile(outputPath, Buffer.from(res.data))
    return outputPath
  }

  private wrapError(err: unknown): AdapterError {
    if (err instanceof AdapterError) return err
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    const message = axios.isAxiosError(err) ? err.message : String(err)

    if (status === 401) {
      return new AdapterError(
        message,
        'custom',
        AdapterErrorCode.AUTH_FAILED,
        false,
        'Replicate API Token 无效，请检查配置',
      )
    }
    if (status === 429) {
      const retryAfter = axios.isAxiosError(err)
        ? Number(err.response?.headers['retry-after'] || 5)
        : 5
      return new AdapterError(
        message,
        'custom',
        AdapterErrorCode.QUOTA_EXCEEDED,
        true,
        `Replicate API 限流，${retryAfter} 秒后重试`,
      )
    }
    return new AdapterError(
      message,
      'custom',
      AdapterErrorCode.NETWORK_ERROR,
      true,
      'Replicate API 请求失败，请检查网络',
      err instanceof Error ? err : undefined,
    )
  }
}
