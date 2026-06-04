import { ipcMain } from 'electron'
import {
  readConfig,
  writeConfig,
  testConnection,
  configFileExists,
  needsOnboarding,
} from '../services/config'
import { getUtilityClient } from '../services/utility-client'
import type { AppConfig } from '../../../src/types/config'
import { logger } from '../services/logger'

export function registerConfigIpc(): void {
  ipcMain.handle('config:read', async () => {
    try {
      return await readConfig()
    } catch (error) {
      logger.error('config:read failed', error)
      throw error
    }
  })

  ipcMain.handle('config:write', async (_e, config: AppConfig) => {
    try {
      await writeConfig(config)
      await getUtilityClient().reloadConfig()
      return { success: true }
    } catch (error) {
      logger.error('config:write failed', error)
      throw error
    }
  })

  ipcMain.handle(
    'config:testConnection',
    async (_e, provider: string, endpoint: string, apiKey?: string) => {
      try {
        return await testConnection(provider, endpoint, apiKey)
      } catch (error) {
        logger.error('config:testConnection failed', error)
        throw error
      }
    },
  )

  ipcMain.handle('config:exists', () => configFileExists())

  ipcMain.handle('config:needsOnboarding', () => needsOnboarding())
}
