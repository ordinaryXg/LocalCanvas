import { ipcMain } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { getUtilityClient } from '../services/utility-client'
import { ensureFFmpeg } from '../services/ffmpeg-setup'
import { readConfig } from '../services/config'
import { getProjectAssetsPath } from '../services/project'
import { logger } from '../services/logger'

export function registerAudioIpc(): void {
  ipcMain.handle('audio:checkDemucs', async () => {
    try {
      const config = await readConfig()
      const demucsPath = config.settings.demucs_path
      const available = await getUtilityClient().checkDemucs(demucsPath)
      return { available, demucsPath: demucsPath || 'demucs' }
    } catch (error) {
      logger.error('audio:checkDemucs failed', error)
      return { available: false, demucsPath: 'demucs' }
    }
  })

  ipcMain.handle(
    'audio:separateVocals',
    async (
      _e,
      payload: {
        projectId: string
        audioPath?: string
        audioAssetPath?: string
      },
    ) => {
      try {
        const ensured = await ensureFFmpeg()
        if (!ensured.ok) {
          throw new Error(
            ensured.reason === 'cancelled' ? '已取消 FFmpeg 配置' : '未检测到可用的 FFmpeg',
          )
        }

        let inputPath = payload.audioPath
        if (!inputPath && payload.audioAssetPath) {
          inputPath = join(getProjectAssetsPath(payload.projectId), payload.audioAssetPath)
        }
        if (!inputPath || !existsSync(inputPath)) {
          throw new Error('音频文件不存在')
        }

        const config = await readConfig()
        const result = await getUtilityClient().separateVocals(inputPath, {
          demucsPath: config.settings.demucs_path,
          apiEndpoint: config.settings.vocal_separation_endpoint,
          apiKey: config.settings.vocal_separation_api_key,
        })

        return result
      } catch (error) {
        logger.error('audio:separateVocals failed', error)
        throw error
      }
    },
  )
}
