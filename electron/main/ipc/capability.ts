import { ipcMain } from 'electron'
import {
  getCapabilityCacheStatus,
  syncCapabilityCache,
} from '../services/capability-sync'
import {
  getProbedProfile,
  listProbedProfiles,
  probeModelCapability,
} from '../services/capability-probe'
import { logger } from '../services/logger'
import type { CapabilityProbeRequest } from '../../../src/types/capability-sync'

export function registerCapabilityIpc(): void {
  ipcMain.handle('capability:sync', async () => {
    try {
      return await syncCapabilityCache()
    } catch (error) {
      logger.error('capability:sync failed', error)
      throw error
    }
  })

  ipcMain.handle('capability:getStatus', async () => {
    try {
      return await getCapabilityCacheStatus()
    } catch (error) {
      logger.error('capability:getStatus failed', error)
      throw error
    }
  })

  ipcMain.handle('capability:probe', async (_e, request: CapabilityProbeRequest) => {
    try {
      return await probeModelCapability(request)
    } catch (error) {
      logger.error('capability:probe failed', error)
      throw error
    }
  })

  ipcMain.handle('capability:listProbedProfiles', () => {
    try {
      return listProbedProfiles()
    } catch (error) {
      logger.error('capability:listProbedProfiles failed', error)
      throw error
    }
  })

  ipcMain.handle('capability:getProbedProfile', (_e, configId: string) => {
    try {
      return getProbedProfile(configId)
    } catch (error) {
      logger.error('capability:getProbedProfile failed', error)
      throw error
    }
  })
}
