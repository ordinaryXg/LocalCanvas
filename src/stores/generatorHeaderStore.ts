import { create } from 'zustand'

export interface GeneratorHeaderActions {
  onGenerate: (() => void) | null
  onCancel: (() => void) | null
  generateDisabled: boolean
  isGenerating: boolean
  progress: number
}

interface GeneratorHeaderState extends GeneratorHeaderActions {
  setActions: (actions: Partial<GeneratorHeaderActions>) => void
  clearActions: () => void
}

const EMPTY: GeneratorHeaderActions = {
  onGenerate: null,
  onCancel: null,
  generateDisabled: true,
  isGenerating: false,
  progress: 0,
}

export const useGeneratorHeaderStore = create<GeneratorHeaderState>((set, get) => ({
  ...EMPTY,
  setActions: (actions) => {
    const s = get()
    const next = { ...s, ...actions }
    const unchanged =
      (actions.onGenerate === undefined || actions.onGenerate === s.onGenerate) &&
      (actions.onCancel === undefined || actions.onCancel === s.onCancel) &&
      (actions.generateDisabled === undefined || actions.generateDisabled === s.generateDisabled) &&
      (actions.isGenerating === undefined || actions.isGenerating === s.isGenerating) &&
      (actions.progress === undefined || actions.progress === s.progress)
    if (unchanged) return
    set(next)
  },
  clearActions: () => {
    const s = get()
    if (
      s.onGenerate === null &&
      s.onCancel === null &&
      s.generateDisabled === EMPTY.generateDisabled &&
      s.isGenerating === EMPTY.isGenerating &&
      s.progress === EMPTY.progress
    ) {
      return
    }
    set(EMPTY)
  },
}))
