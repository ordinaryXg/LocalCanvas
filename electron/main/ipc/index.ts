import { ipcMain, dialog, BrowserWindow } from 'electron'
import {
  createProject,
  loadProject,
  saveProject,
  listProjects,
  deleteProject,
  reorderProjects,
  refreshProjectThumbnail,
  getProjectThumbnailPath,
  getProjectAssetsPath,
  saveWorkflowFile,
  importProjectFromFile,
  type ProjectData,
} from '../services/project'
import { join } from 'path'
import { registerConfigIpc } from './config'
import { registerModelIpc } from './model'
import { registerMediaIpc } from './media'
import { registerHistoryIpc } from './history'
import { registerWorkflowIpc } from './workflow'
import { registerAppIpc } from './app'
import { registerUpdateIpc } from './update'
import { registerAuthIpc } from './auth'
import { registerDagIpc } from './dag'
import { registerAgentIpc } from './agent'
import { registerStoryboardIpc } from './storyboard'
import { registerAudioIpc } from './audio'
import { registerCapabilityIpc } from './capability'
import { restoreSession } from '../services/auth-service'
import { ensureDiskSpace } from '../services/disk-space'
import { logger } from '../services/logger'
import { getMainWindow } from '../window'
import { mt } from '../i18n'

export function registerProjectIpc(): void {
  ipcMain.handle('project:create', (_e, name: string) => {
    try {
      return createProject(name)
    } catch (error) {
      logger.error('project:create failed', error)
      throw error
    }
  })

  ipcMain.handle('project:load', (_e, projectId: string) => {
    try {
      return loadProject(projectId)
    } catch (error) {
      logger.error('project:load failed', error)
      throw error
    }
  })

  ipcMain.handle('project:save', async (_e, data: string) => {
    try {
      const project = JSON.parse(data) as ProjectData
      saveProject(project)
      void refreshProjectThumbnail(project.id, project.nodes).catch((err) => {
        logger.warn('refreshProjectThumbnail failed', err)
      })
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('project:autoSaved', {
          id: project.id,
          at: new Date().toISOString(),
        })
      })
      return { success: true }
    } catch (error) {
      logger.error('project:save failed', error)
      throw error
    }
  })

  ipcMain.handle('project:list', () => {
    try {
      return listProjects()
    } catch (error) {
      logger.error('project:list failed', error)
      throw error
    }
  })

  ipcMain.handle('project:delete', (_e, projectId: string) => {
    try {
      deleteProject(projectId)
      return { success: true }
    } catch (error) {
      logger.error('project:delete failed', error)
      throw error
    }
  })

  ipcMain.handle('project:reorder', (_e, orderedIds: string[]) => {
    try {
      reorderProjects(orderedIds)
      return { success: true }
    } catch (error) {
      logger.error('project:reorder failed', error)
      throw error
    }
  })

  ipcMain.handle('project:readThumbnail', async (_e, projectId: string) => {
    try {
      const { readFile } = await import('fs/promises')
      const path = getProjectThumbnailPath(projectId)
      const { existsSync } = await import('fs')
      if (!existsSync(path)) return null
      const content = await readFile(path)
      return content.buffer
    } catch (error) {
      logger.error('project:readThumbnail failed', error)
      throw error
    }
  })

  ipcMain.handle('project:importFromFile', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: mt('project.import.title'),
        filters: [{ name: mt('dialog.filter.json'), extensions: ['json'] }],
        properties: ['openFile'],
      })
      if (result.canceled || !result.filePaths[0]) {
        return { success: false as const }
      }
      const project = importProjectFromFile(result.filePaths[0])
      return { success: true as const, project: { id: project.id, name: project.name } }
    } catch (error) {
      logger.error('project:importFromFile failed', error)
      throw error
    }
  })

}

export function registerFileIpc(): void {
  ipcMain.handle(
    'file:readAsset',
    async (_e, projectId: string, relativePath: string) => {
      const { readFile } = await import('fs/promises')
      const base = getProjectAssetsPath(projectId)
      const { join } = await import('path')
      const content = await readFile(join(base, relativePath))
      return content.buffer
    },
  )

  ipcMain.handle('file:readAbsolutePath', async (_e, absolutePath: string) => {
    const { readFile } = await import('fs/promises')
    const { normalize } = await import('path')
    const content = await readFile(normalize(absolutePath))
    return content.buffer
  })

  ipcMain.handle(
    'file:writeAsset',
    async (_e, projectId: string, relativePath: string, data: ArrayBuffer) => {
      const { writeFile, mkdir } = await import('fs/promises')
      const { join, dirname } = await import('path')
      const base = getProjectAssetsPath(projectId)
      const fullPath = join(base, relativePath)
      ensureDiskSpace(fullPath, data.byteLength)
      await mkdir(dirname(fullPath), { recursive: true })
      await writeFile(fullPath, Buffer.from(data))
      return { success: true }
    },
  )

  ipcMain.handle('file:selectFile', async (_e, filters: Electron.FileFilter[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters,
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('file:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(
    'file:saveWorkflow',
    (_e, projectId: string, filename: string, content: string) => {
      try {
        return saveWorkflowFile(projectId, filename, content)
      } catch (error) {
        logger.error('file:saveWorkflow failed', error)
        throw error
      }
    },
  )

  ipcMain.handle('file:resolveAssetPath', (_e, projectId: string, relativePath: string) => {
    return join(getProjectAssetsPath(projectId), relativePath)
  })
}

export function registerIpcHandlers(): void {
  restoreSession()
  registerAuthIpc()
  registerDagIpc()
  registerAgentIpc()
  registerStoryboardIpc()
  registerAudioIpc()
  registerAppIpc(getMainWindow)
  registerProjectIpc()
  registerFileIpc()
  registerConfigIpc()
  registerCapabilityIpc()
  registerModelIpc()
  registerMediaIpc()
  registerHistoryIpc()
  registerWorkflowIpc()
  registerUpdateIpc()
}
