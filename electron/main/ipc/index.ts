import { ipcMain, app, dialog, BrowserWindow } from 'electron'
import {
  createProject,
  loadProject,
  saveProject,
  listProjects,
  deleteProject,
  getProjectAssetsPath,
  saveWorkflowFile,
  type ProjectData,
} from '../services/project'
import { logger } from '../services/logger'

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

  ipcMain.handle('project:save', (_e, data: string) => {
    try {
      const project = JSON.parse(data) as ProjectData
      saveProject(project)
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

  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:getDataPath', () => app.getPath('userData'))
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

  ipcMain.handle(
    'file:writeAsset',
    async (_e, projectId: string, relativePath: string, data: ArrayBuffer) => {
      const { writeFile, mkdir } = await import('fs/promises')
      const { join, dirname } = await import('path')
      const base = getProjectAssetsPath(projectId)
      const fullPath = join(base, relativePath)
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
}

export function registerIpcHandlers(): void {
  registerProjectIpc()
  registerFileIpc()
}
