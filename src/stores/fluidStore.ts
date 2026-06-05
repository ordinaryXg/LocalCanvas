import { create } from 'zustand'
import type { FluidEvent, FluidState } from '../types/fluid'

interface FluidStore {
  state: FluidState | null
  events: FluidEvent[]
  loading: boolean
  load: (projectId: string) => Promise<void>
  patch: (projectId: string, patch: Partial<FluidState>) => Promise<void>
  refreshEvents: (projectId: string) => Promise<void>
  clear: () => void
}

export const useFluidStore = create<FluidStore>((set) => ({
  state: null,
  events: [],
  loading: false,
  load: async (projectId) => {
    set({ loading: true })
    const state = await window.api.fluid.getState(projectId)
    const events = await window.api.fluid.listEvents(projectId, 20)
    set({ state, events, loading: false })
  },
  patch: async (projectId, patch) => {
    const state = await window.api.fluid.patchState(projectId, patch)
    set({ state })
  },
  refreshEvents: async (projectId) => {
    const events = await window.api.fluid.listEvents(projectId, 20)
    set({ events })
  },
  clear: () => set({ state: null, events: [] }),
}))
