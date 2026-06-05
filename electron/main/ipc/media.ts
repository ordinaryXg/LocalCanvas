import { ipcMain, shell } from 'electron'
import { join } from 'path'
import { app } from 'electron'
import { statSync } from 'fs'
import { listAssets, importAsset } from '../services/asset'
import { getThumbnail } from '../services/thumbnail'
import { getUtilityClient } from '../services/utility-client'
import { ensureFFmpeg } from '../services/ffmpeg-setup'
import { persistFfmpegPath } from '../services/ffmpeg-config'
import { getProjectAssetsPath } from '../services/project'
import { getDatabase } from '../database'
import { ensureDiskSpace } from '../services/disk-space'
import { logger } from '../services/logger'

export function registerMediaIpc(): void {
  ipcMain.handle('asset:list', (_e, projectId: string) => {
    try {
      return listAssets(projectId)
    } catch (error) {
      logger.error('asset:list failed', error)
      throw error
    }
  })

  ipcMain.handle('asset:import', (_e, projectId: string, filePath: string) => {
    try {
      return importAsset(projectId, filePath)
    } catch (error) {
      logger.error('asset:import failed', error)
      throw error
    }
  })

  ipcMain.handle('asset:thumbnail', async (_e, filePath: string) => {
    try {
      return await getThumbnail(filePath)
    } catch (error) {
      logger.error('asset:thumbnail failed', error)
      throw error
    }
  })

  ipcMain.handle('ffmpeg:ensure', async () => {
    try {
      return await ensureFFmpeg()
    } catch (error) {
      logger.error('ffmpeg:ensure failed', error)
      throw error
    }
  })

  ipcMain.handle('ffmpeg:detect', async (_e, userPath?: string) => {
    try {
      return await getUtilityClient().detectFFmpeg(userPath)
    } catch (error) {
      logger.error('ffmpeg:detect failed', error)
      throw error
    }
  })

  ipcMain.handle('ffmpeg:download', async () => {
    try {
      const result = await getUtilityClient().downloadFFmpeg()
      await persistFfmpegPath(result.path)
      return result
    } catch (error) {
      logger.error('ffmpeg:download failed', error)
      throw error
    }
  })

  ipcMain.handle(
    'ffmpeg:trim',
    async (
      _e,
      payload: { input: string; startTime: number; endTime: number; projectId: string; fileName?: string },
    ) => {
      try {
        const ensured = await ensureFFmpeg()
        if (!ensured.ok) {
          throw new Error(
            ensured.reason === 'cancelled' ? '已取消 FFmpeg 配置' : '未检测到可用的 FFmpeg',
          )
        }

        const ext = payload.input.includes('.') ? payload.input.split('.').pop() : 'mp4'
        const outputName = payload.fileName || `trim-${Date.now()}.${ext}`
        const output = join(getProjectAssetsPath(payload.projectId), 'videos', outputName)
        const result = await getUtilityClient().trimVideo(
          payload.input,
          payload.startTime,
          payload.endTime,
          output,
        )
        return { output: result, relativePath: `videos/${outputName}` }
      } catch (error) {
        logger.error('ffmpeg:trim failed', error)
        throw error
      }
    },
  )

  ipcMain.handle('ffmpeg:getVideoInfo', async (_e, input: string) => {
    try {
      return await getUtilityClient().getVideoInfo(input)
    } catch (error) {
      logger.error('ffmpeg:getVideoInfo failed', error)
      throw error
    }
  })

  ipcMain.handle(
    'compose:start',
    async (
      _e,
      payload: {
        clips: Array<{ id: string; path: string; startTime: number; duration: number }>
        audioPath?: string
        outputName?: string
        reencode?: boolean
        subtitlePath?: string
        burnSubtitles?: boolean
      },
    ) => {
      try {
        const ensured = await ensureFFmpeg()
        if (!ensured.ok) {
          throw new Error(
            ensured.reason === 'cancelled' ? '已取消 FFmpeg 配置' : '未检测到可用的 FFmpeg',
          )
        }

        let estimatedBytes = 100 * 1024 * 1024
        for (const clip of payload.clips) {
          try {
            estimatedBytes += statSync(clip.path).size
          } catch {
            estimatedBytes += 50 * 1024 * 1024
          }
        }
        const outputDir = join(app.getPath('userData'), 'LocalCanvas', 'outputs')
        ensureDiskSpace(join(outputDir, payload.outputName || 'compose.mp4'), estimatedBytes)

        let subtitlePath: string | undefined
        if (payload.burnSubtitles && payload.subtitlePath) {
          const { existsSync } = await import('fs')
          if (existsSync(payload.subtitlePath)) {
            subtitlePath = payload.subtitlePath
          }
        }

        const outputPath = await getUtilityClient().compose({
          ...payload,
          subtitlePath,
        })
        return { outputPath }
      } catch (error) {
        logger.error('compose:start failed', error)
        throw error
      }
    },
  )

  ipcMain.handle('compose:cancel', async () => {
    try {
      await getUtilityClient().cancelCompose()
      return { success: true }
    } catch (error) {
      logger.error('compose:cancel failed', error)
      throw error
    }
  })

  ipcMain.handle('compose:openOutputDir', async () => {
    const dir = join(app.getPath('userData'), 'LocalCanvas', 'outputs')
    await shell.openPath(dir)
    return { success: true }
  })

  ipcMain.handle('project:rename', (_e, projectId: string, name: string) => {
    try {
      const db = getDatabase()
      const now = new Date().toISOString()
      db.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?').run(
        name,
        now,
        projectId,
      )
      return { success: true }
    } catch (error) {
      logger.error('project:rename failed', error)
      throw error
    }
  })

  ipcMain.handle('project:openDir', (_e, projectId: string) => {
    const dir = join(app.getPath('userData'), 'LocalCanvas', 'projects', projectId)
    void shell.openPath(dir)
    return { success: true }
  })
}
