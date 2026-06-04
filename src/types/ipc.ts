import type { ProjectData, ProjectSummary } from './project'

export interface LocalCanvasAPI {
  project: {
    create: (name: string) => Promise<ProjectData>
    load: (projectId: string) => Promise<ProjectData>
    save: (data: string) => Promise<{ success: boolean }>
    list: () => Promise<ProjectSummary[]>
    delete: (projectId: string) => Promise<{ success: boolean }>
  }
  file: {
    readAsset: (projectId: string, relativePath: string) => Promise<ArrayBuffer>
    writeAsset: (projectId: string, relativePath: string, data: ArrayBuffer) => Promise<{ success: boolean }>
    selectFile: (filters: Electron.FileFilter[]) => Promise<string | null>
    selectFolder: () => Promise<string | null>
  }
  app: {
    getVersion: () => Promise<string>
    getDataPath: () => Promise<string>
  }
  on: (channel: string, callback: (...args: unknown[]) => void) => void
  off: (channel: string, callback: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    api: LocalCanvasAPI
  }
}

export {}
