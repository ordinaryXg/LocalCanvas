import { create } from 'zustand'

interface TextEditorState {
  focusDraftTick: number
  requestFocusDraft: () => void
}

export const useTextEditorStore = create<TextEditorState>((set) => ({
  focusDraftTick: 0,
  requestFocusDraft: () => set((s) => ({ focusDraftTick: s.focusDraftTick + 1 })),
}))
