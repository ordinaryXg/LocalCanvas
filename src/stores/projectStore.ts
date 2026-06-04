import { create } from 'zustand'

interface ProjectState {
  currentProjectId: string | null
  projectName: string
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: string | null
  saveError: string | null

  setCurrentProject: (id: string, name: string) => void
  clearProject: () => void
  setDirty: (dirty: boolean) => void
  setProjectName: (name: string) => void
  startSave: () => void
  finishSave: () => void
  failSave: (error: string) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProjectId: null,
  projectName: '',
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  saveError: null,

  setCurrentProject: (id, name) =>
    set({
      currentProjectId: id,
      projectName: name,
      isDirty: false,
      saveError: null,
    }),

  clearProject: () =>
    set({
      currentProjectId: null,
      projectName: '',
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      saveError: null,
    }),

  setDirty: (dirty) => set({ isDirty: dirty }),
  setProjectName: (name) => set({ projectName: name, isDirty: true }),

  startSave: () => set({ isSaving: true, saveError: null }),
  finishSave: () =>
    set({
      isSaving: false,
      isDirty: false,
      lastSavedAt: new Date().toISOString(),
    }),
  failSave: (error) => set({ isSaving: false, saveError: error }),
}))
