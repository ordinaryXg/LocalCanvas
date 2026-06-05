import { ipcMain } from 'electron'
import {
  registerUser,
  loginUser,
  logoutUser,
  restoreSession,
  enterGuestMode,
  updateProfile,
  getProfile,
  claimLegacyData,
  AuthError,
} from '../services/auth-service'
import { logger } from '../services/logger'

export function registerAuthIpc(): void {
  ipcMain.handle('auth:register', async (_e, payload: { username: string; password: string; email?: string }) => {
    try {
      const result = await registerUser(payload.username, payload.password, payload.email)
      const claimed = claimLegacyData()
      return { ...result, claimedLegacyProjects: claimed }
    } catch (error) {
      if (error instanceof AuthError) return { error: error.code, message: error.message }
      logger.error('auth:register failed', error)
      throw error
    }
  })

  ipcMain.handle('auth:login', async (_e, payload: { username: string; password: string }) => {
    try {
      const result = await loginUser(payload.username, payload.password)
      const claimed = claimLegacyData()
      return { ...result, claimedLegacyProjects: claimed }
    } catch (error) {
      if (error instanceof AuthError) return { error: error.code, message: error.message }
      logger.error('auth:login failed', error)
      throw error
    }
  })

  ipcMain.handle('auth:logout', () => {
    return logoutUser()
  })

  ipcMain.handle('auth:enterGuest', () => {
    return enterGuestMode()
  })

  ipcMain.handle('auth:getSession', () => {
    return restoreSession()
  })

  ipcMain.handle(
    'user:updateProfile',
    (_e, updates: { displayName?: string; email?: string; avatarPath?: string; preferences?: Record<string, unknown> }) => {
      try {
        return { user: updateProfile(updates) }
      } catch (error) {
        if (error instanceof AuthError) return { error: error.code, message: error.message }
        throw error
      }
    },
  )

  ipcMain.handle('user:getProfile', () => {
    return { user: getProfile() }
  })
}
