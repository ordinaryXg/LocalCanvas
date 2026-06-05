import { create } from 'zustand'

interface ComposeEditorState {
  activeNodeId: string | null
  dismissed: boolean
  focusMode: boolean
  open: (nodeId: string) => void
  close: () => void
  clear: () => void
  setFocusMode: (focus: boolean) => void
}

export const useComposeEditorStore = create<ComposeEditorState>((set) => ({
  activeNodeId: null,
  dismissed: false,
  focusMode: false,
  open: (nodeId) => set({ activeNodeId: nodeId, dismissed: false }),
  close: () => set({ dismissed: true }),
  clear: () => set({ activeNodeId: null, dismissed: false, focusMode: false }),
  setFocusMode: (focusMode) => set({ focusMode }),
}))
