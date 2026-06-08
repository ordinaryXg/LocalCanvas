import { create } from 'zustand'
import type { DagRunState } from '../types/dag'

interface DagRunStoreState {
  runState: DagRunState | null
  isRunning: boolean
  setRunState: (state: DagRunState | null | ((prev: DagRunState | null) => DagRunState | null)) => void
  setIsRunning: (running: boolean) => void
}

export const useDagRunStore = create<DagRunStoreState>((set) => ({
  runState: null,
  isRunning: false,
  setRunState: (next) =>
    set((s) => ({
      runState: typeof next === 'function' ? next(s.runState) : next,
    })),
  setIsRunning: (isRunning) => set({ isRunning }),
}))
