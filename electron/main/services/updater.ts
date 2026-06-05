import { autoUpdater } from 'electron-updater'
import { BrowserWindow, app } from 'electron'
import { logger } from './logger'

let initialized = false

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  if (initialized || !app.isPackaged) return
  initialized = true

  autoUpdater.autoDownload = false
  autoUpdater.logger = null

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:progress', {
      percentage: progress.percent,
      speed: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded', {})
  })

  autoUpdater.on('error', (err) => {
    logger.warn('Auto-updater error', err.message)
    mainWindow.webContents.send('update:error', { error: err.message })
  })

  void autoUpdater.checkForUpdates().catch((err) => {
    logger.warn('checkForUpdates failed', err.message)
  })
}

export function checkForUpdate(): Promise<{ hasUpdate: boolean; version?: string }> {
  if (!app.isPackaged) {
    return Promise.resolve({ hasUpdate: false })
  }
  return autoUpdater.checkForUpdates().then((result) => ({
    hasUpdate: !!result?.updateInfo?.version,
    version: result?.updateInfo?.version,
  }))
}

export function downloadUpdate(): void {
  void autoUpdater.downloadUpdate()
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
