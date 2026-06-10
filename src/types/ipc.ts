import type { ProjectData, ProjectSummary } from './project'
import type { AppConfig, ConnectionTestResult } from './config'
import type {
  CapabilityCacheStatus,
  CapabilityProbeRequest,
  CapabilityProbeResult,
  CapabilitySyncResult,
  ProbedProfileEntry,
} from './capability-sync'

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
  modelId: string
  prompt: string
}

export interface ModelCompleteEvent {
  taskId: string
  nodeId: string
  result: string
  reasoningContent?: string
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
  referenceImage?: string
  referenceImages?: string[]
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
  referenceImages?: string[]
  referenceVideo?: string
  referenceAudio?: string
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
  thinkingPreset?: 'off' | 'balanced' | 'deep'
  images?: string[]
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
  trimIn?: number
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

export interface GenerationRecord {
  id: string
  type: 'image' | 'video' | 'text' | 'audio'
  modelId: string
  modelName: string
  provider: string
  prompt: string
  negativePrompt?: string
  params?: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  outputPath?: string
  thumbnailPath?: string
  error?: string
  projectId?: string
  nodeId?: string
  durationMs?: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  updatedAt: string
}

export interface GenerationStats {
  total: number
  images: number
  videos: number
  texts: number
  failed: number
}

export interface WorkflowSummary {
  id: string
  name: string
  description?: string
  isPreset: boolean
  updatedAt: string
}

export interface WorkflowData {
  id: string
  name: string
  description?: string
  nodes: unknown[]
  edges: unknown[]
  isPreset: boolean
}

export interface PublicUser {
  id: string
  username: string
  email?: string
  displayName?: string
  avatarPath?: string
  preferences?: Record<string, unknown>
  syncStatus: 'local' | 'pending' | 'synced'
  cloudUserId?: string
  createdAt: string
  updatedAt: string
}

export interface AuthResult {
  user: PublicUser | null
  session: { sessionId: string; userId: string; isGuest: boolean } | null
  isGuest: boolean
  error?: string
  message?: string
  claimedLegacyProjects?: number
}

export interface LocalCanvasAPI {
  auth: {
    register: (payload: { username: string; password: string; email?: string }) => Promise<AuthResult>
    login: (payload: { username: string; password: string }) => Promise<AuthResult>
    logout: () => Promise<AuthResult>
    enterGuest: () => Promise<AuthResult>
    getSession: () => Promise<AuthResult>
  }
  user: {
    getProfile: () => Promise<{ user: PublicUser | null; error?: string; message?: string }>
    updateProfile: (updates: {
      displayName?: string
      email?: string
      avatarPath?: string
      preferences?: Record<string, unknown>
    }) => Promise<{ user?: PublicUser; error?: string; message?: string }>
  }
  agent: {
    chat: (payload: {
      message: string
      sessionId?: string
      disabledSkills?: string[]
      freePlan?: boolean
    }) => Promise<import('./agent').AgentChatResult>
    buildFromTemplate: (payload: {
      skillId: string
      intent: string
      sessionId?: string
      disabledSkills?: string[]
    }) => Promise<import('./agent').AgentChatResult>
    buildPatch: (payload: {
      message: string
      sessionId?: string
      focusedNodeIds: string[]
      canvasNodes: import('./agent').CanvasNodeSnapshot[]
      canvasEdges: import('./agent').CanvasEdgeSnapshot[]
    }) => Promise<import('./agent').AgentChatResult>
    listSessions: (projectId?: string) => Promise<import('./agent').AgentSessionSummary[]>
    getSession: (sessionId: string) => Promise<import('./agent').AgentSessionDetail | null>
    listSkills: () => Promise<{ skills: Array<{ id: string; name: string; description: string }> }>
  }
  dag: {
    createRun: (payload: {
      projectId: string
      nodeIds: string[]
      snapshot: unknown
      groupId?: string
    }) => Promise<{ id: string; nodes: unknown[] }>
    getRun: (dagRunId: string) => Promise<unknown>
    updateRun: (payload: {
      dagRunId: string
      status?: string
      completedNodes?: number
      currentNodeId?: string
      error?: string
    }) => Promise<{ success: boolean }>
    updateNode: (payload: {
      dagRunId: string
      nodeId: string
      status?: string
      error?: string
      output?: string
    }) => Promise<{ success: boolean }>
    recover: () => Promise<Array<{ id: string; projectId: string }>>
  }
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
  capability: {
    sync: () => Promise<CapabilitySyncResult>
    getStatus: () => Promise<CapabilityCacheStatus>
    probe: (request: CapabilityProbeRequest) => Promise<CapabilityProbeResult>
    listProbedProfiles: () => Promise<ProbedProfileEntry[]>
    getProbedProfile: (configId: string) => Promise<import('./capability').ModelCapabilityProfile | null>
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
    setDirty: (dirty: boolean) => Promise<{ success: boolean }>
    setActiveProject: (projectId: string | null) => Promise<{ success: boolean }>
    setLocale: (locale: 'zh-CN' | 'en-US') => Promise<{ success: boolean }>
    quitConfirmed: () => Promise<{ success: boolean }>
  }
  update: {
    check: () => Promise<{ hasUpdate: boolean; version?: string }>
    download: () => Promise<{ success: boolean }>
    install: () => Promise<{ success: boolean }>
  }
  asset: {
    list: (projectId: string) => Promise<AssetItem[]>
    import: (projectId: string, filePath: string) => Promise<AssetItem>
    thumbnail: (filePath: string) => Promise<string>
    delete: (projectId: string, relativePath: string) => Promise<{ success: boolean }>
    revealInFolder: (projectId: string, relativePath: string) => Promise<{ success: boolean }>
    open: (projectId: string, relativePath: string) => Promise<{ success: boolean }>
    openFolder: (projectId: string, relativePath: string) => Promise<{ success: boolean }>
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
      audioVolume?: number
      audioFadeIn?: number
      audioFadeOut?: number
      subtitlePath?: string
      burnSubtitles?: boolean
      outputName?: string
      reencode?: boolean
    }) => Promise<{ outputPath: string }>
    cancel: () => Promise<{ success: boolean }>
    openOutputDir: () => Promise<{ success: boolean }>
  }
  storyboard: {
    export: (payload: {
      projectId: string
      format: 'png' | 'frame4k'
      layout?: 'list' | 'grid3' | 'grid5'
      baseName?: string
      frames: Array<{
        sequence: number
        description: string
        imagePath?: string
        imageAssetPath?: string
      }>
      frameSequence?: number
    }) => Promise<{ outputPath: string; format: string }>
    openOutputDir: () => Promise<{ success: boolean }>
  }
  audio: {
    checkDemucs: () => Promise<{ available: boolean; demucsPath: string }>
    separateVocals: (payload: {
      projectId: string
      audioPath?: string
      audioAssetPath?: string
    }) => Promise<{ vocalsPath: string; instrumentalPath: string; mode: string }>
  }
  projectExtra: {
    rename: (projectId: string, name: string) => Promise<{ success: boolean }>
    openDir: (projectId: string) => Promise<{ success: boolean }>
  }
  history: {
    query: (filter?: {
      type?: string
      search?: string
      limit?: number
      offset?: number
    }) => Promise<GenerationRecord[]>
    getStats: () => Promise<GenerationStats>
    delete: (id: string) => Promise<{ success: boolean }>
  }
  workflow: {
    list: (presetOnly?: boolean) => Promise<WorkflowSummary[]>
    load: (workflowId: string) => Promise<WorkflowData>
    save: (payload: {
      name: string
      nodes: unknown[]
      edges: unknown[]
      description?: string
    }) => Promise<{ id: string }>
    delete: (workflowId: string) => Promise<{ success: boolean }>
    export: (workflowId: string) => Promise<{ success: boolean; path?: string }>
    import: () => Promise<{ success: boolean; id?: string }>
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
