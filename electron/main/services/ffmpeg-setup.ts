import { dialog, shell } from 'electron'
import { getUtilityClient } from './utility-client'
import { readConfig } from './config'
import { persistFfmpegPath } from './ffmpeg-config'
import { logger } from './logger'

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
    title: '需要 FFmpeg',
    message: '视频裁切与合成依赖 FFmpeg，当前未检测到可用安装。',
    detail:
      '你可以自动下载、手动安装后在「设置 → FFmpeg 路径」中填写，或直接选择 ffmpeg 可执行文件。',
    buttons: ['选择 ffmpeg 文件', '自动下载 FFmpeg', '打开下载页', '取消'],
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
        title: '下载失败',
        message: error instanceof Error ? error.message : 'FFmpeg 自动下载失败',
      })
      return { ok: false, reason: 'download_failed' }
    }
  }

  const picked = await dialog.showOpenDialog({
    title: '选择 FFmpeg 可执行文件',
    properties: ['openFile'],
    filters: process.platform === 'win32'
      ? [{ name: 'FFmpeg', extensions: ['exe'] }]
      : [{ name: 'FFmpeg', extensions: ['*'] }],
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
      title: 'FFmpeg 无效',
      message: '所选文件无法作为 FFmpeg 运行，请重新选择或在设置中配置路径。',
    })
    return { ok: false, reason: 'invalid' }
  }
}
