import { create } from 'zustand'
import type { BreathPhase } from '../types/fluid'
import { FLUID_UI } from '../constants/fluidFeatures'

interface BreathStore {
  phase: BreathPhase
  setPhase: (phase: BreathPhase) => void
  forceHold: () => void
  canShowWorkflowPlan: () => boolean
}

export const useBreathStore = create<BreathStore>((set, get) => ({
  phase: 'idle',
  setPhase: (phase) => set({ phase }),
  forceHold: () => set({ phase: 'hold' }),
  canShowWorkflowPlan: () => {
    if (!FLUID_UI) return true
    const { phase } = get()
    return phase === 'exhale' || phase === 'idle'
  },
}))
