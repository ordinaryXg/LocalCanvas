import { utilityProcess, BrowserWindow } from 'electron'
import { join } from 'path'
import { v4 as uuid } from 'uuid'
import { getConfigPath, ensureConfigFile } from './config'
import { logger } from './logger'

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

export class UtilityClient {
  private process: Electron.UtilityProcess | null = null
  private ready = false
  private pending = new Map<string, PendingRequest>()
  private taskResolvers = new Map<
    string,
    { resolve: (path: string) => void; reject: (err: Error) => void; nodeId: string }
  >()

  private getUtilityPath(): string {
    return join(__dirname, 'utility.js')
  }

  async start(dbPath: string): Promise<void> {
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
        const payload = data as { taskId: string; nodeId: string; result: string }
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
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('model:batchItemComplete', data)
        })
        break
      }
    }
  }

  private send(channel: string, data: Record<string, unknown>, timeoutMs = 120000): Promise<unknown> {
    return new Promise((resolve, reject) => {
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
  }

  async generateImage(
    modelId: string,
    nodeId: string,
    params: Record<string, unknown>,
  ): Promise<string> {
    const response = (await this.send('model:generateImage', { modelId, nodeId, params })) as {
      taskId: string
    }
    return this.waitForTask(response.taskId, nodeId)
  }

  async generateVideo(
    modelId: string,
    nodeId: string,
    params: Record<string, unknown>,
  ): Promise<string> {
    const response = (await this.send('model:generateVideo', { modelId, nodeId, params })) as {
      taskId: string
    }
    return this.waitForTask(response.taskId, nodeId)
  }

  async generateText(
    modelId: string,
    nodeId: string,
    params: Record<string, unknown>,
  ): Promise<string> {
    const response = (await this.send('model:generateText', { modelId, nodeId, params })) as {
      taskId: string
    }
    return this.waitForTask(response.taskId, nodeId)
  }

  async generateAudio(
    modelId: string,
    nodeId: string,
    params: Record<string, unknown>,
  ): Promise<string> {
    const response = (await this.send('model:generateAudio', { modelId, nodeId, params })) as {
      taskId: string
    }
    return this.waitForTask(response.taskId, nodeId)
  }

  async cancel(taskId: string): Promise<void> {
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
