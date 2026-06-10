import { utilityProcess, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { v4 as uuid } from 'uuid'
import { getConfigPath, ensureConfigFile } from './config'
import { getDbPath } from '../ipc/model'
import { trackGenerationComplete, trackGenerationError, trackBatchItemComplete, getActiveProjectId } from './generation-tracker'
import { logger } from './logger'

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

export class UtilityClient {
  private process: Electron.UtilityProcess | null = null
  private ready = false
  private dbPath: string | null = null
  private starting: Promise<void> | null = null
  private pending = new Map<string, PendingRequest>()
  private taskResolvers = new Map<
    string,
    { resolve: (path: string) => void; reject: (err: Error) => void; nodeId: string }
  >()

  private getUtilityPath(): string {
    return join(__dirname, 'utility.js')
  }

  async start(dbPath: string): Promise<void> {
    if (this.process && this.ready) return
    if (this.starting) return this.starting

    this.dbPath = dbPath
    this.starting = this.launchUtility(dbPath)
    try {
      await this.starting
    } finally {
      this.starting = null
    }
  }

  private async launchUtility(dbPath: string): Promise<void> {
    if (this.process) return

    const utilityPath = this.getUtilityPath()
    this.process = utilityProcess.fork(utilityPath, [], {
      serviceName: 'localcanvas-utility',
    })

    this.process.on('message', (message: { channel: string; data: unknown; requestId?: string }) => {
      this.handleMessage(message)
    })

    this.process.on('exit', (code) => {
      logger.warn('Utility process exited', code)
      this.ready = false
      this.process = null
      if (code !== 0 && code !== null) {
        logger.warn('Utility process crashed, will restart on next request')
      }
    })

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Utility process startup timeout')), 15000)
      const onMessage = (message: { channel: string }) => {
        if (message.channel === 'utility:starting') {
          void (async () => {
            const config = await ensureConfigFile()
            this.process!.postMessage({
              type: 'init',
              dbPath,
              configPath: getConfigPath(),
              outputDir: config.settings.output_dir,
              userDataPath: app.getPath('userData'),
            })
          })()
        }
        if (message.channel === 'utility:ready') {
          clearTimeout(timeout)
          this.process!.off('message', onMessage)
          this.ready = true
          resolve()
        }
      }
      this.process!.on('message', onMessage)
    })

    logger.info('Utility process started')
  }

  private handleMessage(message: { channel: string; data: unknown; requestId?: string }): void {
    const { channel, data, requestId } = message

    if (requestId && this.pending.has(requestId)) {
      const pending = this.pending.get(requestId)!
      clearTimeout(pending.timeout)
      this.pending.delete(requestId)
      pending.resolve(data)
    }

    switch (channel) {
      case 'model:progress': {
        const payload = data as { nodeId: string; percentage: number; taskId: string }
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('model:progress', payload)
        })
        break
      }
      case 'model:complete': {
        const payload = data as {
          taskId: string
          nodeId: string
          result: string
          reasoningContent?: string
        }
        trackGenerationComplete(payload.taskId, payload.result)
        const resolver = this.taskResolvers.get(payload.taskId)
        if (resolver) {
          this.taskResolvers.delete(payload.taskId)
          resolver.resolve(payload.result)
        }
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('model:complete', payload)
        })
        break
      }
      case 'model:error': {
        const payload = data as { taskId?: string; nodeId?: string; error: string }
        if (payload.taskId) {
          trackGenerationError(payload.taskId, payload.error)
          const resolver = this.taskResolvers.get(payload.taskId)
          if (resolver) {
            this.taskResolvers.delete(payload.taskId)
            resolver.reject(new Error(payload.error))
          }
        }
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('model:error', payload)
        })
        break
      }
      case 'model:batchItemComplete': {
        const payload = data as {
          scriptNodeId: string
          type: 'image' | 'video'
          sequence: number
          result: string
          modelId: string
          prompt: string
        }
        trackBatchItemComplete({
          type: payload.type,
          modelId: payload.modelId,
          nodeId: payload.scriptNodeId,
          prompt: payload.prompt,
          outputPath: payload.result,
          projectId: getActiveProjectId() ?? undefined,
        })
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('model:batchItemComplete', data)
        })
        break
      }
      case 'compose:progress': {
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('compose:progress', data)
        })
        break
      }
      case 'ffmpeg:progress': {
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('ffmpeg:progress', data)
        })
        break
      }
    }
  }

  private async ensureReady(): Promise<void> {
    if (this.process && this.ready) return
    const dbPath = this.dbPath ?? getDbPath()
    await this.start(dbPath)
  }

  private send(channel: string, data: Record<string, unknown>, timeoutMs = 120000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      void this.ensureReady()
        .then(() => {
          if (!this.process || !this.ready) {
            reject(new Error('Utility process not ready'))
            return
          }

          const id = uuid()
          const timeout = setTimeout(() => {
            this.pending.delete(id)
            reject(new Error(`Utility request timeout: ${channel}`))
          }, timeoutMs)

          this.pending.set(id, {
            resolve: (value) => {
              const payload = value as { error?: string }
              if (payload?.error) {
                reject(new Error(payload.error))
              } else {
                resolve(value)
              }
            },
            reject,
            timeout,
          })
          this.process.postMessage({ id, channel, data })
        })
        .catch(reject)
    })
  }

  async beginGenerateImage(
    modelId: string,
    nodeId: string,
    params: Record<string, unknown>,
  ): Promise<{ taskId: string }> {
    return (await this.send('model:generateImage', { modelId, nodeId, params })) as {
      taskId: string
    }
  }

  async generateImage(
    modelId: string,
    nodeId: string,
    params: Record<string, unknown>,
  ): Promise<string> {
    const { taskId } = await this.beginGenerateImage(modelId, nodeId, params)
    return this.waitForTask(taskId, nodeId)
  }

  async beginGenerateVideo(
    modelId: string,
    nodeId: string,
    params: Record<string, unknown>,
  ): Promise<{ taskId: string }> {
    return (await this.send('model:generateVideo', { modelId, nodeId, params })) as {
      taskId: string
    }
  }

  async generateVideo(
    modelId: string,
    nodeId: string,
    params: Record<string, unknown>,
  ): Promise<string> {
    const { taskId } = await this.beginGenerateVideo(modelId, nodeId, params)
    return this.waitForTask(taskId, nodeId)
  }

  async beginGenerateText(
    modelId: string,
    nodeId: string,
    params: Record<string, unknown>,
  ): Promise<{ taskId: string }> {
    return (await this.send('model:generateText', { modelId, nodeId, params })) as {
      taskId: string
    }
  }

  async generateText(
    modelId: string,
    nodeId: string,
    params: Record<string, unknown>,
  ): Promise<string> {
    const { taskId } = await this.beginGenerateText(modelId, nodeId, params)
    return this.waitForTask(taskId, nodeId)
  }

  async beginGenerateAudio(
    modelId: string,
    nodeId: string,
    params: Record<string, unknown>,
  ): Promise<{ taskId: string }> {
    return (await this.send('model:generateAudio', { modelId, nodeId, params })) as {
      taskId: string
    }
  }

  async generateAudio(
    modelId: string,
    nodeId: string,
    params: Record<string, unknown>,
  ): Promise<string> {
    const { taskId } = await this.beginGenerateAudio(modelId, nodeId, params)
    return this.waitForTask(taskId, nodeId)
  }

  async cancel(taskId: string): Promise<void> {
    const resolver = this.taskResolvers.get(taskId)
    if (resolver) {
      this.taskResolvers.delete(taskId)
      resolver.reject(new Error('任务已取消'))
    }
    await this.send('model:cancel', { taskId })
  }

  async generateScript(payload: {
    modelId: string
    storyInput: string
    characterInput?: string
  }): Promise<{ title: string; rows: Array<{ sequence: number; description: string; prompt: string; duration: number; camera: string }> }> {
    return (await this.send('model:generateScript', payload, 180000)) as {
      title: string
      rows: Array<{ sequence: number; description: string; prompt: string; duration: number; camera: string }>
    }
  }

  async batchGenerateImages(payload: {
    scriptNodeId: string
    modelId: string
    tasks: Array<{ sequence: number; prompt: string; width: number; height: number; negativePrompt?: string }>
  }): Promise<{ scriptNodeId: string; results: Array<{ sequence: number; result: string }> }> {
    return (await this.send('model:batchGenerateImages', payload, 600000)) as {
      scriptNodeId: string
      results: Array<{ sequence: number; result: string }>
    }
  }

  async agentChat(payload: {
    message: string
    disabledSkills?: string[]
  }): Promise<{ reply: string; plan?: unknown; skillId?: string }> {
    return (await this.send('agent:chat', payload, 120000)) as {
      reply: string
      plan?: unknown
      skillId?: string
    }
  }

  async listAgentSkills(): Promise<{ skills: Array<{ id: string; name: string; description: string }> }> {
    return (await this.send('agent:listSkills', {}, 10000)) as {
      skills: Array<{ id: string; name: string; description: string }>
    }
  }

  async batchGenerateVideos(payload: {
    scriptNodeId: string
    modelId: string
    tasks: Array<{
      sequence: number
      prompt: string
      duration: number
      width: number
      height: number
      camera?: string
      firstFrame?: string
      ratio?: string
      resolution?: string
      generateAudio?: boolean
    }>
  }): Promise<{ scriptNodeId: string; results: Array<{ sequence: number; result: string }> }> {
    return (await this.send('model:batchGenerateVideos', payload, 600000)) as {
      scriptNodeId: string
      results: Array<{ sequence: number; result: string }>
    }
  }

  reloadConfig(): Promise<void> {
    if (!this.process || !this.ready) return Promise.resolve()
    return this.send('config:reload', { configPath: getConfigPath() }, 10000).then(() => undefined)
  }

  async detectFFmpeg(userPath?: string): Promise<{ path: string }> {
    return (await this.send('ffmpeg:detect', { userPath }, 30000)) as { path: string }
  }

  async downloadFFmpeg(): Promise<{ path: string }> {
    return (await this.send('ffmpeg:download', {}, 600000)) as { path: string }
  }

  async trimVideo(
    input: string,
    startTime: number,
    endTime: number,
    output: string,
  ): Promise<string> {
    const result = (await this.send(
      'ffmpeg:trim',
      { input, startTime, endTime, output },
      600000,
    )) as { output: string }
    return result.output
  }

  async getVideoInfo(input: string): Promise<{
    duration: number
    width: number
    height: number
    fps: number
    bitrate: number
    codec: string
  }> {
    const result = (await this.send('ffmpeg:getVideoInfo', { input }, 30000)) as {
      info: {
        duration: number
        width: number
        height: number
        fps: number
        bitrate: number
        codec: string
      }
    }
    return result.info
  }

  async generateThumbnail(input: string, time: number, output?: string): Promise<string> {
    const result = (await this.send(
      'ffmpeg:generateThumbnail',
      { input, time, output },
      60000,
    )) as { path: string }
    return result.path
  }

  async compose(payload: {
    clips: Array<{ id: string; path: string; startTime: number; duration: number }>
    audioPath?: string
    audioVolume?: number
    audioFadeIn?: number
    audioFadeOut?: number
    subtitlePath?: string
    burnSubtitles?: boolean
    outputName?: string
    reencode?: boolean
  }): Promise<string> {
    const result = (await this.send(
      'compose:start',
      { options: payload },
      600000,
    )) as { outputPath: string }
    return result.outputPath
  }

  async cancelCompose(): Promise<void> {
    await this.send('compose:cancel', {}, 10000)
  }

  async exportStoryboard(payload: {
    frames: Array<{ sequence: number; description: string; imagePath?: string }>
    layout: 'list' | 'grid3' | 'grid5'
    format: 'png'
    baseName?: string
  }): Promise<string> {
    const result = (await this.send('storyboard:export', payload, 300000)) as {
      outputPath: string
    }
    return result.outputPath
  }

  async exportStoryboardFrame4k(imagePath: string, sequence: number): Promise<string> {
    const result = (await this.send(
      'storyboard:exportFrame4k',
      { imagePath, sequence },
      120000,
    )) as { outputPath: string }
    return result.outputPath
  }

  async checkDemucs(demucsPath?: string): Promise<boolean> {
    const result = (await this.send('audio:checkDemucs', { demucsPath }, 15000)) as {
      available: boolean
    }
    return result.available
  }

  async separateVocals(
    inputPath: string,
    options?: {
      demucsPath?: string
      apiEndpoint?: string
      apiKey?: string
    },
  ): Promise<{ vocalsPath: string; instrumentalPath: string; mode: string }> {
    return (await this.send(
      'audio:separateVocals',
      { inputPath, ...options },
      600000,
    )) as { vocalsPath: string; instrumentalPath: string; mode: string }
  }

  private waitForTask(taskId: string, nodeId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.taskResolvers.delete(taskId)
        reject(new Error('Generation timeout'))
      }, 600000)

      this.taskResolvers.set(taskId, {
        resolve: (path) => {
          clearTimeout(timeout)
          resolve(path)
        },
        reject: (err) => {
          clearTimeout(timeout)
          reject(err)
        },
        nodeId,
      })
    })
  }

  stop(): void {
    this.process?.kill()
    this.process = null
    this.ready = false
  }
}

let client: UtilityClient | null = null

export function getUtilityClient(): UtilityClient {
  if (!client) {
    client = new UtilityClient()
  }
  return client
}
