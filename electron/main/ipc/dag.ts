import { ipcMain, BrowserWindow } from 'electron'
import { dagRunRepository } from '../repositories/dag-run-repository'
import { logger } from '../services/logger'

export function registerDagIpc(): void {
  ipcMain.handle(
    'dag:createRun',
    (
      _e,
      payload: {
        projectId: string
        nodeIds: string[]
        snapshot: unknown
        groupId?: string
      },
    ) => {
      try {
        const id = dagRunRepository.create(payload.projectId, payload.snapshot, payload.nodeIds, payload.groupId)
        return { id, nodes: dagRunRepository.findNodes(id) }
      } catch (error) {
        logger.error('dag:createRun failed', error)
        throw error
      }
    },
  )

  ipcMain.handle('dag:getRun', (_e, dagRunId: string) => {
    const run = dagRunRepository.findById(dagRunId)
    if (!run) return null
    return { run, nodes: dagRunRepository.findNodes(dagRunId) }
  })

  ipcMain.handle(
    'dag:updateRun',
    (
      _e,
      payload: {
        dagRunId: string
        status?: string
        completedNodes?: number
        currentNodeId?: string
        error?: string
      },
    ) => {
      dagRunRepository.updateRun(payload.dagRunId, {
        status: payload.status as Parameters<typeof dagRunRepository.updateRun>[1]['status'],
        completedNodes: payload.completedNodes,
        currentNodeId: payload.currentNodeId,
        error: payload.error,
      })
      broadcastDagProgress(payload.dagRunId)
      return { success: true }
    },
  )

  ipcMain.handle(
    'dag:updateNode',
    (
      _e,
      payload: {
        dagRunId: string
        nodeId: string
        status?: string
        error?: string
        output?: string
      },
    ) => {
      dagRunRepository.updateNode(payload.dagRunId, payload.nodeId, {
        status: payload.status as Parameters<typeof dagRunRepository.updateNode>[2]['status'],
        error: payload.error,
        output: payload.output,
      })
      broadcastDagProgress(payload.dagRunId)
      return { success: true }
    },
  )

  ipcMain.handle('dag:recover', () => {
    return dagRunRepository.recoverInterruptedRuns()
  })
}

function broadcastDagProgress(dagRunId: string): void {
  const run = dagRunRepository.findById(dagRunId)
  if (!run) return
  const nodes = dagRunRepository.findNodes(dagRunId)
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('dag:progress', { run, nodes })
  })
}
