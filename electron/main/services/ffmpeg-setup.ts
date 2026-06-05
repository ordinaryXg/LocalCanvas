import { dialog, shell } from 'electron'
import { getUtilityClient } from './utility-client'
import { readConfig } from './config'
import { persistFfmpegPath } from './ffmpeg-config'
import { logger } from './logger'
import { mt } from '../i18n'

export type EnsureFfmpegResult =
  | { ok: true; path: string }
  | { ok: false; reason: 'cancelled' | 'not_found' | 'invalid' | 'download_failed' }

/**
 * 检测 FFmpeg；缺失时弹窗引导用户选择二进制、自动下载或打开下载页。
 */
export async function ensureFFmpeg(): Promise<EnsureFfmpegResult> {
  const config = await readConfig()
  const configuredPath = config.settings.ffmpeg_path?.trim()

  try {
    const result = await getUtilityClient().detectFFmpeg(configuredPath || undefined)
    return { ok: true, path: result.path }
  } catch {
    /* continue to prompt */
  }

  const choice = await dialog.showMessageBox({
    type: 'warning',
    title: mt('ffmpeg.required.title'),
    message: mt('ffmpeg.required.message'),
    detail: mt('ffmpeg.required.detail'),
    buttons: [
      mt('ffmpeg.pickFile'),
      mt('ffmpeg.autoDownload'),
      mt('ffmpeg.openDownloadPage'),
      mt('ffmpeg.cancel'),
    ],
    defaultId: 1,
    cancelId: 3,
  })

  if (choice.response === 3) {
    return { ok: false, reason: 'cancelled' }
  }

  if (choice.response === 2) {
    await shell.openExternal('https://ffmpeg.org/download.html')
    return { ok: false, reason: 'not_found' }
  }

  if (choice.response === 1) {
    try {
      const result = await getUtilityClient().downloadFFmpeg()
      await persistFfmpegPath(result.path)
      return { ok: true, path: result.path }
    } catch (error) {
      logger.warn('FFmpeg auto-download failed', error)
      await dialog.showMessageBox({
        type: 'error',
        title: mt('ffmpeg.downloadFailed.title'),
        message: error instanceof Error ? error.message : mt('ffmpeg.downloadFailed.title'),
      })
      return { ok: false, reason: 'download_failed' }
    }
  }

  const picked = await dialog.showOpenDialog({
    title: mt('ffmpeg.pickDialog.title'),
    properties: ['openFile'],
    filters:
      process.platform === 'win32'
        ? [{ name: mt('ffmpeg.filterName'), extensions: ['exe'] }]
        : [{ name: mt('ffmpeg.filterName'), extensions: ['*'] }],
  })

  const filePath = picked.filePaths[0]
  if (!filePath) {
    return { ok: false, reason: 'cancelled' }
  }

  try {
    const result = await getUtilityClient().detectFFmpeg(filePath)
    await persistFfmpegPath(result.path)
    return { ok: true, path: result.path }
  } catch (error) {
    logger.warn('User-selected FFmpeg invalid', error)
    await dialog.showMessageBox({
      type: 'error',
      title: mt('ffmpeg.invalid.title'),
      message: mt('ffmpeg.invalid.message'),
    })
    return { ok: false, reason: 'invalid' }
  }
}
