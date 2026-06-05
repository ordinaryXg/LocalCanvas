import { ipcMain } from 'electron'
import { getGenerationRepository } from '../repositories/generation-repository'
import { logger } from '../services/logger'

export function registerHistoryIpc(): void {
  ipcMain.handle(
    'history:query',
    (_e, filter?: { type?: string; search?: string; limit?: number; offset?: number }) => {
      try {
        const repo = getGenerationRepository()
        if (filter?.search?.trim()) {
          return repo.search(filter.search.trim(), filter.type, filter.limit, filter.offset)
        }
        const typeFilter =
          filter?.type && filter.type !== 'all'
            ? { type: filter.type as 'image' | 'video' | 'text' | 'audio' }
            : undefined
        return repo.findAll(typeFilter)
      } catch (error) {
        logger.error('history:query failed', error)
        throw error
      }
    },
  )

  ipcMain.handle('history:getStats', () => {
    try {
      return getGenerationRepository().getStats()
    } catch (error) {
      logger.error('history:getStats failed', error)
      throw error
    }
  })

  ipcMain.handle('history:delete', (_e, id: string) => {
    try {
      getGenerationRepository().delete(id)
      return { success: true }
    } catch (error) {
      logger.error('history:delete failed', error)
      throw error
    }
  })
}
