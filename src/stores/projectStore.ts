import { create } from 'zustand'
import type { CreativeBibleEntry, ProjectMetadata } from '../types/project'
import {
  emptyProjectMetadata,
  mergeCreativeBibleEntries,
  normalizeProjectMetadata,
} from '../utils/creativeBible'

interface ProjectState {
  currentProjectId: string | null
  projectName: string
  metadata: ProjectMetadata
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: string | null
  saveError: string | null

  setCurrentProject: (id: string, name: string, metadata?: ProjectMetadata) => void
  clearProject: () => void
  setDirty: (dirty: boolean) => void
  setProjectName: (name: string) => void
  setMetadata: (metadata: ProjectMetadata) => void
  mergeCreativeBible: (entries: CreativeBibleEntry[]) => void
  startSave: () => void
  finishSave: () => void
  failSave: (error: string) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProjectId: null,
  projectName: '',
  metadata: emptyProjectMetadata(),
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  saveError: null,

  setCurrentProject: (id, name, metadata) =>
    set({
      currentProjectId: id,
      projectName: name,
      metadata: normalizeProjectMetadata(metadata),
      isDirty: false,
      saveError: null,
    }),

  clearProject: () =>
    set({
      currentProjectId: null,
      projectName: '',
      metadata: emptyProjectMetadata(),
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      saveError: null,
    }),

  setDirty: (dirty) => set({ isDirty: dirty }),
  setProjectName: (name) => set({ projectName: name, isDirty: true }),

  setMetadata: (metadata) =>
    set({ metadata: normalizeProjectMetadata(metadata), isDirty: true }),

  mergeCreativeBible: (entries) =>
    set((s) => ({
      metadata: {
        version: 1,
        creativeBible: mergeCreativeBibleEntries(s.metadata.creativeBible, entries),
      },
      isDirty: true,
    })),

  startSave: () => set({ isSaving: true, saveError: null }),
  finishSave: () =>
    set({
      isSaving: false,
      isDirty: false,
      lastSavedAt: new Date().toISOString(),
    }),
  failSave: (error) => set({ isSaving: false, saveError: error }),
}))
