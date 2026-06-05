import { ipcMain, dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { getWorkflowRepository } from '../repositories/workflow-repository'
import { logger } from '../services/logger'
import { mt } from '../i18n'

export function registerWorkflowIpc(): void {
  ipcMain.handle('workflow:list', (_e, presetOnly?: boolean) => {
    try {
      return getWorkflowRepository().listSummaries(presetOnly)
    } catch (error) {
      logger.error('workflow:list failed', error)
      throw error
    }
  })

  ipcMain.handle('workflow:load', (_e, workflowId: string) => {
    try {
      const workflow = getWorkflowRepository().findById(workflowId)
      if (!workflow) throw new Error('Workflow not found')
      return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
        isPreset: workflow.isPreset,
      }
    } catch (error) {
      logger.error('workflow:load failed', error)
      throw error
    }
  })

  ipcMain.handle(
    'workflow:save',
    (_e, payload: { name: string; nodes: unknown[]; edges: unknown[]; description?: string }) => {
      try {
        const id = getWorkflowRepository().create({
          name: payload.name,
          description: payload.description,
          nodes: payload.nodes,
          edges: payload.edges,
          isPreset: false,
        })
        return { id }
      } catch (error) {
        logger.error('workflow:save failed', error)
        throw error
      }
    },
  )

  ipcMain.handle('workflow:delete', (_e, workflowId: string) => {
    try {
      getWorkflowRepository().delete(workflowId)
      return { success: true }
    } catch (error) {
      logger.error('workflow:delete failed', error)
      throw error
    }
  })

  ipcMain.handle('workflow:export', async (_e, workflowId: string) => {
    try {
      const json = getWorkflowRepository().exportJson(workflowId)
      const result = await dialog.showSaveDialog({
        title: mt('workflow.export.title'),
        filters: [{ name: mt('dialog.filter.json'), extensions: ['json'] }],
        defaultPath: 'workflow.json',
      })
      if (result.canceled || !result.filePath) return { success: false }
      writeFileSync(result.filePath, json, 'utf-8')
      return { success: true, path: result.filePath }
    } catch (error) {
      logger.error('workflow:export failed', error)
      throw error
    }
  })

  ipcMain.handle('workflow:import', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: mt('workflow.import.title'),
        filters: [{ name: mt('dialog.filter.json'), extensions: ['json'] }],
        properties: ['openFile'],
      })
      if (result.canceled || !result.filePaths[0]) return { success: false }
      const json = readFileSync(result.filePaths[0], 'utf-8')
      const id = getWorkflowRepository().importJson(json)
      return { success: true, id }
    } catch (error) {
      logger.error('workflow:import failed', error)
      throw error
    }
  })
}
