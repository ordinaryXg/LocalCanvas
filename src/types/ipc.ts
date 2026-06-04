import type { ProjectData, ProjectSummary } from './project'
import type { AppConfig, ConnectionTestResult } from './config'

export interface ModelProgressEvent {
  taskId?: string
  nodeId: string
  percentage: number
  batchSequence?: number
}

export interface BatchItemCompleteEvent {
  scriptNodeId: string
  type: 'image' | 'video'
  sequence: number
  result: string
}

export interface ModelCompleteEvent {
  taskId: string
  nodeId: string
  result: string
}

export interface ModelErrorEvent {
  taskId?: string
  nodeId?: string
  error: string
}

export interface GenerateImageRequest {
  modelId: string
  nodeId: string
  prompt: string
  negativePrompt?: string
  width: number
  height: number
  model?: string
  batchSize?: number
  steps?: number
  cfg?: number
}

export interface GenerateVideoRequest {
  modelId: string
  nodeId: string
  prompt: string
  width: number
  height: number
  duration: number
  firstFrame?: string
  lastFrame?: string
  camera?: string
  ratio?: string
  resolution?: string
  generateAudio?: boolean
}

export interface GenerateTextRequest {
  modelId: string
  nodeId: string
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

export interface GenerateAudioRequest {
  modelId: string
  nodeId: string
  text: string
  voice?: string
}

export interface GenerateScriptRequest {
  modelId: string
  storyInput: string
  characterInput?: string
}

export interface BatchImageTaskRequest {
  sequence: number
  prompt: string
  width: number
  height: number
  negativePrompt?: string
}

export interface BatchVideoTaskRequest {
  sequence: number
  prompt: string
  duration: number
  width: number
  height: number
  camera?: string
  firstFrame?: string
  ratio?: string
  resolution?: string
  generateAudio?: boolean
}

export interface BatchGenerateRequest {
  scriptNodeId: string
  modelId: string
  tasks: BatchImageTaskRequest[] | BatchVideoTaskRequest[]
}

export interface BatchGenerateResult {
  scriptNodeId: string
  results: Array<{ sequence: number; result: string }>
}

export interface ScriptGenerateResult {
  title: string
  rows: Array<{
    sequence: number
    description: string
    prompt: string
    duration: number
    camera: string
  }>
}

export interface VideoInfo {
  duration: number
  width: number
  height: number
  fps: number
  bitrate: number
  codec: string
}

export interface AssetItem {
  id: string
  name: string
  path: string
  absolutePath: string
  type: 'image' | 'video' | 'audio'
  size: number
  modifiedAt: string
  thumbnail?: string
  duration?: number
}

export interface ComposeClip {
  id: string
  path: string
  startTime: number
  duration: number
}

export interface ComposeProgressEvent {
  percentage: number
  requestId?: string
}

export interface TrimResult {
  output: string
  relativePath: string
}

export interface EnsureFfmpegResult =
  | { ok: true; path: string }
  | { ok: false; reason: 'cancelled' | 'not_found' | 'invalid' | 'download_failed' }

export interface LocalCanvasAPI {
  project: {
    create: (name: string) => Promise<ProjectData>
    load: (projectId: string) => Promise<ProjectData>
    save: (data: string) => Promise<{ success: boolean }>
    list: () => Promise<ProjectSummary[]>
    delete: (projectId: string) => Promise<{ success: boolean }>
    reorder: (orderedIds: string[]) => Promise<{ success: boolean }>
    readThumbnail: (projectId: string) => Promise<ArrayBuffer | null>
  }
  file: {
    readAsset: (projectId: string, relativePath: string) => Promise<ArrayBuffer>
    readAbsolutePath: (absolutePath: string) => Promise<ArrayBuffer>
    writeAsset: (projectId: string, relativePath: string, data: ArrayBuffer) => Promise<{ success: boolean }>
    selectFile: (filters: Electron.FileFilter[]) => Promise<string | null>
    selectFolder: () => Promise<string | null>
    saveWorkflow: (
      projectId: string,
      filename: string,
      content: string,
    ) => Promise<{ fileName: string }>
    resolveAssetPath: (projectId: string, relativePath: string) => Promise<string>
  }
  config: {
    read: () => Promise<AppConfig>
    write: (config: AppConfig) => Promise<{ success: boolean }>
    testConnection: (provider: string, endpoint: string, apiKey?: string) => Promise<ConnectionTestResult>
    exists: () => Promise<boolean>
    needsOnboarding: () => Promise<boolean>
  }
  model: {
    beginGenerateImage: (payload: GenerateImageRequest) => Promise<{ taskId: string }>
    generateImage: (payload: GenerateImageRequest) => Promise<string>
    beginGenerateVideo: (payload: GenerateVideoRequest) => Promise<{ taskId: string }>
    generateVideo: (payload: GenerateVideoRequest) => Promise<string>
    beginGenerateText: (payload: GenerateTextRequest) => Promise<{ taskId: string }>
    generateText: (payload: GenerateTextRequest) => Promise<string>
    beginGenerateAudio: (payload: GenerateAudioRequest) => Promise<{ taskId: string }>
    generateAudio: (payload: GenerateAudioRequest) => Promise<string>
    generateScript: (payload: GenerateScriptRequest) => Promise<ScriptGenerateResult>
    batchGenerateImages: (payload: {
      scriptNodeId: string
      modelId: string
      tasks: BatchImageTaskRequest[]
    }) => Promise<BatchGenerateResult>
    batchGenerateVideos: (payload: {
      scriptNodeId: string
      modelId: string
      tasks: BatchVideoTaskRequest[]
    }) => Promise<BatchGenerateResult>
    cancel: (taskId: string) => Promise<{ success: boolean }>
  }
  app: {
    getVersion: () => Promise<string>
    getDataPath: () => Promise<string>
    openExternal: (url: string) => Promise<{ success: boolean }>
  }
  asset: {
    list: (projectId: string) => Promise<AssetItem[]>
    import: (projectId: string, filePath: string) => Promise<AssetItem>
    thumbnail: (filePath: string) => Promise<string>
  }
  ffmpeg: {
    detect: (userPath?: string) => Promise<{ path: string }>
    download: () => Promise<{ path: string }>
    ensure: () => Promise<EnsureFfmpegResult>
    trim: (payload: {
      input: string
      startTime: number
      endTime: number
      projectId: string
      fileName?: string
    }) => Promise<TrimResult>
    getVideoInfo: (input: string) => Promise<VideoInfo>
  }
  compose: {
    start: (payload: {
      clips: ComposeClip[]
      audioPath?: string
      outputName?: string
      reencode?: boolean
    }) => Promise<{ outputPath: string }>
    cancel: () => Promise<{ success: boolean }>
    openOutputDir: () => Promise<{ success: boolean }>
  }
  projectExtra: {
    rename: (projectId: string, name: string) => Promise<{ success: boolean }>
    openDir: (projectId: string) => Promise<{ success: boolean }>
  }
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
  off: (channel: string, callback: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    api: LocalCanvasAPI
  }
}

export {}
