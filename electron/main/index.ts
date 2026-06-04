import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { getDatabase, closeDatabase } from './database'
import { getUtilityClient } from './services/utility-client'
import { getDbPath } from './ipc/model'
import './services/logger'
import { logger } from './services/logger'

let mainWindow: BrowserWindow | null = null

function getPreloadPath(): string {
  if (is.dev) {
    return join(__dirname, '../../electron/preload/index.cjs')
  }
  return join(__dirname, '../preload/index.cjs')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'LocalCanvas',
    backgroundColor: '#1a1a2e',
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.localcanvas.app')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  getDatabase()
  registerIpcHandlers()
  void getUtilityClient()
    .start(getDbPath())
    .catch((err) => logger.error('Failed to start utility process', err))
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

app.on('before-quit', () => {
  getUtilityClient().stop()
  closeDatabase()
})

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

logger.info('LocalCanvas main process starting')
