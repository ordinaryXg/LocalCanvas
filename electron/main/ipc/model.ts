import { ipcMain } from 'electron'
import { join } from 'path'
import { app } from 'electron'
import { getUtilityClient } from '../services/utility-client'
import { trackGenerationStart, getActiveProjectId } from '../services/generation-tracker'
import { logger } from '../services/logger'

export function registerModelIpc(): void {
  ipcMain.handle(
    'model:beginGenerateImage',
    async (
      _e,
      payload: {
        modelId: string
        nodeId: string
        prompt: string
        negativePrompt?: string
        width: number
        height: number
        batchSize?: number
        referenceImage?: string
        referenceImages?: string[]
      },
    ) => {
      try {
        const result = await getUtilityClient().beginGenerateImage(payload.modelId, payload.nodeId, {
          prompt: payload.prompt,
          negativePrompt: payload.negativePrompt,
          width: payload.width,
          height: payload.height,
          batchSize: payload.batchSize,
          referenceImage: payload.referenceImage,
          referenceImages: payload.referenceImages,
        })
        trackGenerationStart(
          result.taskId,
          'image',
          payload.modelId,
          payload.nodeId,
          payload.prompt,
          getActiveProjectId() ?? undefined,
          payload.negativePrompt,
          { width: payload.width, height: payload.height, batchSize: payload.batchSize },
        )
        return result
      } catch (error) {
        logger.error('model:beginGenerateImage failed', error)
        throw error
      }
    },
  )

  ipcMain.handle(
    'model:generateImage',
    async (
      _e,
      payload: {
        modelId: string
        nodeId: string
        prompt: string
        negativePrompt?: string
        width: number
        height: number
        batchSize?: number
        referenceImage?: string
        referenceImages?: string[]
      },
    ) => {
      try {
        return await getUtilityClient().generateImage(payload.modelId, payload.nodeId, {
          prompt: payload.prompt,
          negativePrompt: payload.negativePrompt,
          width: payload.width,
          height: payload.height,
          batchSize: payload.batchSize,
          referenceImage: payload.referenceImage,
          referenceImages: payload.referenceImages,
        })
      } catch (error) {
        logger.error('model:generateImage failed', error)
        throw error
      }
    },
  )

  ipcMain.handle(
    'model:beginGenerateVideo',
    async (
      _e,
      payload: {
        modelId: string
        nodeId: string
        prompt: string
        width: number
        height: number
        duration: number
        firstFrame?: string
        lastFrame?: string
        referenceImages?: string[]
        referenceVideo?: string
        referenceAudio?: string
        camera?: string
        ratio?: string
        resolution?: string
        generateAudio?: boolean
      },
    ) => {
      try {
        const result = await getUtilityClient().beginGenerateVideo(payload.modelId, payload.nodeId, {
          prompt: payload.prompt,
          width: payload.width,
          height: payload.height,
          duration: payload.duration,
          firstFrame: payload.firstFrame,
          lastFrame: payload.lastFrame,
          referenceImages: payload.referenceImages,
          referenceVideo: payload.referenceVideo,
          referenceAudio: payload.referenceAudio,
          camera: payload.camera,
          ratio: payload.ratio,
          resolution: payload.resolution,
          generateAudio: payload.generateAudio,
        })
        trackGenerationStart(result.taskId, 'video', payload.modelId, payload.nodeId, payload.prompt, getActiveProjectId() ?? undefined, undefined, {
          width: payload.width,
          height: payload.height,
          duration: payload.duration,
        })
        return result
      } catch (error) {
        logger.error('model:beginGenerateVideo failed', error)
        throw error
      }
    },
  )

  ipcMain.handle(
    'model:generateVideo',
    async (
      _e,
      payload: {
        modelId: string
        nodeId: string
        prompt: string
        width: number
        height: number
        duration: number
        firstFrame?: string
        lastFrame?: string
        referenceImages?: string[]
        referenceVideo?: string
        referenceAudio?: string
        camera?: string
        ratio?: string
        resolution?: string
        generateAudio?: boolean
      },
    ) => {
      try {
        return await getUtilityClient().generateVideo(payload.modelId, payload.nodeId, {
          prompt: payload.prompt,
          width: payload.width,
          height: payload.height,
          duration: payload.duration,
          firstFrame: payload.firstFrame,
          lastFrame: payload.lastFrame,
          referenceImages: payload.referenceImages,
          referenceVideo: payload.referenceVideo,
          referenceAudio: payload.referenceAudio,
          camera: payload.camera,
          ratio: payload.ratio,
          resolution: payload.resolution,
          generateAudio: payload.generateAudio,
        })
      } catch (error) {
        logger.error('model:generateVideo failed', error)
        throw error
      }
    },
  )

  ipcMain.handle(
    'model:beginGenerateText',
    async (
      _e,
      payload: {
        modelId: string
        nodeId: string
        prompt: string
        systemPrompt?: string
        maxTokens?: number
        temperature?: number
        thinkingPreset?: 'off' | 'balanced' | 'deep'
        images?: string[]
      },
    ) => {
      try {
        const result = await getUtilityClient().beginGenerateText(payload.modelId, payload.nodeId, {
          prompt: payload.prompt,
          systemPrompt: payload.systemPrompt,
          maxTokens: payload.maxTokens,
          temperature: payload.temperature,
          thinkingPreset: payload.thinkingPreset,
          images: payload.images,
        })
        trackGenerationStart(result.taskId, 'text', payload.modelId, payload.nodeId, payload.prompt, getActiveProjectId() ?? undefined)
        return result
      } catch (error) {
        logger.error('model:beginGenerateText failed', error)
        throw error
      }
    },
  )

  ipcMain.handle(
    'model:generateText',
    async (
      _e,
      payload: {
        modelId: string
        nodeId: string
        prompt: string
        systemPrompt?: string
        maxTokens?: number
        temperature?: number
        thinkingPreset?: 'off' | 'balanced' | 'deep'
        images?: string[]
      },
    ) => {
      try {
        return await getUtilityClient().generateText(payload.modelId, payload.nodeId, {
          prompt: payload.prompt,
          systemPrompt: payload.systemPrompt,
          maxTokens: payload.maxTokens,
          temperature: payload.temperature,
          thinkingPreset: payload.thinkingPreset,
          images: payload.images,
        })
      } catch (error) {
        logger.error('model:generateText failed', error)
        throw error
      }
    },
  )

  ipcMain.handle(
    'model:beginGenerateAudio',
    async (
      _e,
      payload: {
        modelId: string
        nodeId: string
        text: string
        voice?: string
      },
    ) => {
      try {
        const result = await getUtilityClient().beginGenerateAudio(payload.modelId, payload.nodeId, {
          text: payload.text,
          voice: payload.voice,
        })
        trackGenerationStart(result.taskId, 'audio', payload.modelId, payload.nodeId, payload.text, getActiveProjectId() ?? undefined)
        return result
      } catch (error) {
        logger.error('model:beginGenerateAudio failed', error)
        throw error
      }
    },
  )

  ipcMain.handle(
    'model:generateAudio',
    async (
      _e,
      payload: {
        modelId: string
        nodeId: string
        text: string
        voice?: string
      },
    ) => {
      try {
        return await getUtilityClient().generateAudio(payload.modelId, payload.nodeId, {
          text: payload.text,
          voice: payload.voice,
        })
      } catch (error) {
        logger.error('model:generateAudio failed', error)
        throw error
      }
    },
  )

  ipcMain.handle('model:cancel', async (_e, taskId: string) => {
    try {
      await getUtilityClient().cancel(taskId)
      return { success: true }
    } catch (error) {
      logger.error('model:cancel failed', error)
      throw error
    }
  })

  ipcMain.handle(
    'model:generateScript',
    async (
      _e,
      payload: {
        modelId: string
        storyInput: string
        characterInput?: string
      },
    ) => {
      try {
        return await getUtilityClient().generateScript(payload)
      } catch (error) {
        logger.error('model:generateScript failed', error)
        throw error
      }
    },
  )

  ipcMain.handle(
    'model:batchGenerateImages',
    async (
      _e,
      payload: {
        scriptNodeId: string
        modelId: string
        tasks: Array<{
          sequence: number
          prompt: string
          width: number
          height: number
          negativePrompt?: string
        }>
      },
    ) => {
      try {
        await getUtilityClient().reloadConfig()
        return await getUtilityClient().batchGenerateImages(payload)
      } catch (error) {
        logger.error('model:batchGenerateImages failed', error)
        throw error
      }
    },
  )

  ipcMain.handle(
    'model:batchGenerateVideos',
    async (
      _e,
      payload: {
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
      },
    ) => {
      try {
        await getUtilityClient().reloadConfig()
        return await getUtilityClient().batchGenerateVideos(payload)
      } catch (error) {
        logger.error('model:batchGenerateVideos failed', error)
        throw error
      }
    },
  )
}

export function getDbPath(): string {
  return join(app.getPath('userData'), 'LocalCanvas', 'localcanvas.db')
}
