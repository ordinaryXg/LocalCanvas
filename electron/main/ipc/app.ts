import { ipcMain, app, dialog, BrowserWindow } from 'electron'
import { logger } from '../services/logger'
import { setActiveProjectId } from '../services/generation-tracker'
import { mt, setMainLocale, type MainLocale } from '../i18n'

let projectDirty = false
let allowQuit = false

export function isProjectDirty(): boolean {
  return projectDirty
}

export function setAllowQuit(value: boolean): void {
  allowQuit = value
}

export function registerAppIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:getDataPath', () => app.getPath('userData'))

  ipcMain.handle('app:setLocale', (_e, locale: MainLocale) => {
    setMainLocale(locale, getWindow)
    return { success: true }
  })

  ipcMain.handle('app:setDirty', (_e, dirty: boolean) => {
    projectDirty = dirty
    return { success: true }
  })

  ipcMain.handle('app:setActiveProject', (_e, projectId: string | null) => {
    setActiveProjectId(projectId)
    return { success: true }
  })

  ipcMain.handle('app:quitConfirmed', () => {
    allowQuit = true
    projectDirty = false
    const win = getWindow()
    if (win) {
      win.close()
    } else {
      app.quit()
    }
    return { success: true }
  })

  ipcMain.handle('app:openExternal', async (_e, url: string) => {
    const { shell } = await import('electron')
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only http(s) URLs are allowed')
      }
      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      logger.error('app:openExternal failed', error)
      throw error
    }
  })
}

export async function handleWindowClose(
  event: Electron.Event,
  window: BrowserWindow,
): Promise<void> {
  if (allowQuit || !projectDirty) return

  event.preventDefault()
  const { response } = await dialog.showMessageBox(window, {
    type: 'question',
    buttons: [
      mt('dialog.unsaved.saveQuit'),
      mt('dialog.unsaved.discard'),
      mt('dialog.unsaved.cancel'),
    ],
    defaultId: 0,
    cancelId: 2,
    title: mt('dialog.unsaved.title'),
    message: mt('dialog.unsaved.message'),
  })

  if (response === 0) {
    window.webContents.send('app:requestSave')
  } else if (response === 1) {
    allowQuit = true
    projectDirty = false
    window.close()
  }
}
