import { ipcMain } from 'electron'
import { checkForUpdate, downloadUpdate, installUpdate } from '../services/updater'
import { logger } from '../services/logger'

export function registerUpdateIpc(): void {
  ipcMain.handle('update:check', async () => {
    try {
      return await checkForUpdate()
    } catch (error) {
      logger.error('update:check failed', error)
      throw error
    }
  })

  ipcMain.handle('update:download', () => {
    try {
      downloadUpdate()
      return { success: true }
    } catch (error) {
      logger.error('update:download failed', error)
      throw error
    }
  })

  ipcMain.handle('update:install', () => {
    try {
      installUpdate()
      return { success: true }
    } catch (error) {
      logger.error('update:install failed', error)
      throw error
    }
  })
}
