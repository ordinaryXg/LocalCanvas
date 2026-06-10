import { create } from 'zustand'

interface StoryboardEditorState {
  focusNodeId: string | null
  focusFrameId: string | null
  requestFrameFocus: (nodeId: string, frameId: string) => void
  clearFrameFocus: () => void
}

export const useStoryboardEditorStore = create<StoryboardEditorState>((set) => ({
  focusNodeId: null,
  focusFrameId: null,
  requestFrameFocus: (nodeId, frameId) =>
    set({ focusNodeId: nodeId, focusFrameId: frameId }),
  clearFrameFocus: () => set({ focusNodeId: null, focusFrameId: null }),
}))
