import { create } from 'zustand'

export interface PublicUser {
  id: string
  username: string
  email?: string
  displayName?: string
  avatarPath?: string
  preferences?: Record<string, unknown>
  syncStatus: 'local' | 'pending' | 'synced'
  cloudUserId?: string
  createdAt: string
  updatedAt: string
}

interface UserState {
  user: PublicUser | null
  isGuest: boolean
  authReady: boolean
  setAuth: (user: PublicUser | null, isGuest: boolean) => void
  setAuthReady: (ready: boolean) => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isGuest: true,
  authReady: false,
  setAuth: (user, isGuest) => set({ user, isGuest }),
  setAuthReady: (authReady) => set({ authReady }),
}))
