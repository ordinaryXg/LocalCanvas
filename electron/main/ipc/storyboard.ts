import { ipcMain, shell, app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { getUtilityClient } from '../services/utility-client'
import { ensureFFmpeg } from '../services/ffmpeg-setup'
import { getProjectAssetsPath } from '../services/project'
import { logger } from '../services/logger'

export interface StoryboardExportFramePayload {
  sequence: number
  description: string
  imagePath?: string
  imageAssetPath?: string
}

export function registerStoryboardIpc(): void {
  ipcMain.handle(
    'storyboard:export',
    async (
      _e,
      payload: {
        projectId: string
        format: 'png' | 'frame4k'
        layout?: 'list' | 'grid3' | 'grid5'
        baseName?: string
        frames: StoryboardExportFramePayload[]
        frameSequence?: number
      },
    ) => {
      try {
        const ensured = await ensureFFmpeg()
        if (!ensured.ok) {
          throw new Error(
            ensured.reason === 'cancelled' ? '已取消 FFmpeg 配置' : '未检测到可用的 FFmpeg',
          )
        }

        const assetsBase = getProjectAssetsPath(payload.projectId)
        const resolvedFrames = payload.frames.map((f) => {
          let imagePath = f.imagePath
          if (!imagePath && f.imageAssetPath) {
            imagePath = join(assetsBase, f.imageAssetPath)
          }
          return {
            sequence: f.sequence,
            description: f.description,
            imagePath: imagePath && existsSync(imagePath) ? imagePath : undefined,
          }
        })

        const client = getUtilityClient()

        if (payload.format === 'frame4k') {
          const seq = payload.frameSequence ?? resolvedFrames[0]?.sequence ?? 1
          const frame = resolvedFrames.find((f) => f.sequence === seq) ?? resolvedFrames[0]
          if (!frame?.imagePath) throw new Error('所选帧没有可导出的图片')
          const outputPath = await client.exportStoryboardFrame4k(frame.imagePath, seq)
          return { outputPath, format: payload.format }
        }

        const outputPath = await client.exportStoryboard({
          frames: resolvedFrames,
          layout: payload.layout ?? 'grid3',
          format: payload.format,
          baseName: payload.baseName ?? 'storyboard',
        })

        return { outputPath, format: payload.format }
      } catch (error) {
        logger.error('storyboard:export failed', error)
        throw error
      }
    },
  )

  ipcMain.handle('storyboard:openOutputDir', async () => {
    const dir = join(app.getPath('userData'), 'LocalCanvas', 'outputs')
    await shell.openPath(dir)
    return { success: true }
  })
}
