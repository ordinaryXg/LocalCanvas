import Database from 'better-sqlite3'
import { readFileSync, existsSync } from 'fs'
import { parse } from 'yaml'
import { AdapterRegistry } from './services/model-adapter/factory'
import { TaskQueue, createTaskId } from './services/task-queue'
import { generateScriptFromStory } from './services/script-generator'
import { batchGenerateImages, batchGenerateVideos } from './services/batch-generator'
import { ConfigWatcher } from './services/config-watcher'
import type { AppConfig } from '../../src/types/config'
import { getAdapterErrorMessage } from '../../src/types/adapter-errors'
import { DEFAULT_SEEDANCE_VIDEO_MODEL } from '../../src/constants/seedance'
import { buildDefaultSeedanceVideoModels } from '../../src/constants/modelPresets'
import type {
  GenerateImageParams,
  GenerateVideoParams,
  GenerateTextParams,
  GenerateAudioParams,
} from './services/model-adapter/base'
import { detectFFmpeg, initFfmpegPaths, downloadFFmpeg } from './services/ffmpeg'
import {
  trimVideo,
  getVideoInfo,
  generateThumbnail,
  mergeAudioVideo,
  extractAudio,
  initFfmpegService,
} from './services/ffmpeg-service'
import {
  compose,
  cancelCompose,
  initComposeService,
  type ComposeOptions,
} from './services/compose-service'
import { agentChat } from './services/agent/agent-service'
import { listSkills } from './services/agent/skills/index'
import {
  exportStoryboardPng,
  exportFrame4k,
  type StoryboardExportFrame,
  type StoryboardExportLayout,
} from './services/storyboard-export'
import { separateVocals, detectDemucs } from './services/audio/vocal-separator'

interface InitMessage {
  type: 'init'
  dbPath: string
  configPath: string
  outputDir: string
  userDataPath: string
}

interface UtilityRequest {
  id: string
  channel: string
  data: Record<string, unknown>
}

let taskQueue: TaskQueue | null = null
let adapters: AdapterRegistry | null = null
let configWatcher: ConfigWatcher | null = null
let currentConfig: AppConfig | null = null
let utilityUserDataPath = ''

function createDefaultUtilityConfig(outputDir = ''): AppConfig {
  return {
    image_models: [],
    video_models: buildDefaultSeedanceVideoModels(),
    llm_models: [],
    tts_models: [],
    settings: {
      default_image_model: '',
      default_video_model: DEFAULT_SEEDANCE_VIDEO_MODEL.id,
      default_llm: '',
      default_tts: '',
      output_dir: outputDir,
      temp_dir: '',
      max_concurrent_tasks: 3,
      auto_save_interval: 30,
      ffmpeg_path: '',
    },
  }
}

function loadConfigFromPath(configPath: string, outputDir = ''): AppConfig {
  if (!existsSync(configPath)) {
    return createDefaultUtilityConfig(outputDir)
  }

  try {
    const raw = readFileSync(configPath, 'utf-8')
    const parsed = parse(raw) as Partial<AppConfig>
    const defaults = createDefaultUtilityConfig(outputDir)
    return {
      image_models: parsed.image_models ?? defaults.image_models,
      video_models: parsed.video_models ?? defaults.video_models,
      llm_models: parsed.llm_models ?? defaults.llm_models,
      tts_models: parsed.tts_models ?? defaults.tts_models,
      settings: { ...defaults.settings, ...parsed.settings },
    }
  } catch {
    return createDefaultUtilityConfig(outputDir)
  }
}

function post(channel: string, data: unknown, requestId?: string): void {
  process.parentPort?.postMessage({ channel, data, requestId })
}

function initUtility(msg: InitMessage): void {
  const db = new Database(msg.dbPath)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS task_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      node_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      params TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      result TEXT,
      error TEXT,
      progress REAL NOT NULL DEFAULT 0,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_task_queue_status ON task_queue(status);
  `)

  utilityUserDataPath = msg.userDataPath
  const config = loadConfigFromPath(msg.configPath, msg.outputDir)
  currentConfig = config
  initFfmpegPaths(msg.userDataPath, config.settings.ffmpeg_path)
  initFfmpegService(msg.userDataPath)
  initComposeService(msg.userDataPath)
  adapters = new AdapterRegistry({ outputDir: msg.outputDir })
  adapters.reloadFromConfig(config)

  configWatcher = new ConfigWatcher(adapters, msg.configPath, (path) => loadConfigFromPath(path, msg.outputDir), () => {
    if (currentConfig && taskQueue) {
      currentConfig = loadConfigFromPath(msg.configPath, msg.outputDir)
      taskQueue.setMaxConcurrent(currentConfig.settings.max_concurrent_tasks || 3)
    }
    post('config:reloaded', {})
  })
  configWatcher.start()

  taskQueue = new TaskQueue(db, {
    maxConcurrent: config.settings.max_concurrent_tasks || 3,
    getAdapter: (task) => {
      if (!adapters) throw new Error('Adapters not initialized')
      switch (task.type) {
        case 'image':
          return adapters.getImageAdapter(task.modelId)
        case 'video':
          return adapters.getVideoAdapter(task.modelId)
        case 'text':
          return adapters.getLLMAdapter(task.modelId)
        case 'audio':
          return adapters.getTTSAdapter(task.modelId)
      }
    },
  })

  taskQueue.on('task:progress', (p: { taskId: string; nodeId: string; progress: number }) => {
    post('model:progress', {
      taskId: p.taskId,
      nodeId: p.nodeId,
      percentage: p.progress,
    })
  })

  taskQueue.on(
    'task:complete',
    (p: { taskId: string; nodeId: string; result: string }) => {
      post('model:complete', p)
    },
  )

  taskQueue.on(
    'task:fail',
    (p: { taskId: string; nodeId: string; error: string }) => {
      post('model:error', p)
    },
  )

  post('utility:ready', {})
}

async function handleFfmpegRequest(req: UtilityRequest): Promise<void> {
  try {
    if (req.channel === 'ffmpeg:download') {
      const path = await downloadFFmpeg((percentage) =>
        post('ffmpeg:progress', { percentage, requestId: req.id }),
      )
      post('ffmpeg:downloadResult', { path }, req.id)
      return
    }

    await detectFFmpeg(currentConfig?.settings.ffmpeg_path)

    switch (req.channel) {
      case 'ffmpeg:detect': {
        const path = await detectFFmpeg(req.data.userPath as string | undefined)
        post('ffmpeg:detectResult', { path }, req.id)
        break
      }
      case 'ffmpeg:trim': {
        const output = await trimVideo(
          req.data.input as string,
          req.data.startTime as number,
          req.data.endTime as number,
          req.data.output as string,
          (percentage) => post('ffmpeg:progress', { percentage, requestId: req.id }),
        )
        post('ffmpeg:trimResult', { output }, req.id)
        break
      }
      case 'ffmpeg:getVideoInfo': {
        const info = await getVideoInfo(req.data.input as string)
        post('ffmpeg:videoInfo', { info }, req.id)
        break
      }
      case 'ffmpeg:generateThumbnail': {
        const thumb = await generateThumbnail(
          req.data.input as string,
          (req.data.time as number) ?? 0.5,
          req.data.output as string | undefined,
        )
        post('ffmpeg:thumbnailResult', { path: thumb }, req.id)
        break
      }
      case 'ffmpeg:mergeAudio': {
        const output = await mergeAudioVideo(
          req.data.videoPath as string,
          req.data.audioPath as string,
          req.data.output as string,
          (percentage) => post('ffmpeg:progress', { percentage, requestId: req.id }),
        )
        post('ffmpeg:mergeResult', { output }, req.id)
        break
      }
      case 'ffmpeg:extractAudio': {
        const output = await extractAudio(
          req.data.input as string,
          req.data.output as string,
        )
        post('ffmpeg:extractResult', { output }, req.id)
        break
      }
      default:
        post('ffmpeg:error', { error: `Unknown ffmpeg channel: ${req.channel}` }, req.id)
    }
  } catch (error) {
    post(
      'ffmpeg:error',
      { error: error instanceof Error ? error.message : String(error) },
      req.id,
    )
  }
}

async function handleComposeRequest(req: UtilityRequest): Promise<void> {
  try {
    await detectFFmpeg(currentConfig?.settings.ffmpeg_path)

    switch (req.channel) {
      case 'compose:start': {
        const options = req.data.options as ComposeOptions
        const outputPath = await compose(options, (percentage) => {
          post('compose:progress', { percentage, requestId: req.id })
        })
        post('compose:complete', { outputPath }, req.id)
        break
      }
      case 'compose:cancel': {
        cancelCompose()
        post('compose:cancelled', {}, req.id)
        break
      }
      default:
        post('compose:error', { error: `Unknown compose channel: ${req.channel}` }, req.id)
    }
  } catch (error) {
    post(
      'compose:error',
      { error: error instanceof Error ? error.message : String(error) },
      req.id,
    )
  }
}

async function handleStoryboardRequest(req: UtilityRequest): Promise<void> {
  try {
    await detectFFmpeg(currentConfig?.settings.ffmpeg_path)

    switch (req.channel) {
      case 'storyboard:export': {
        const frames = req.data.frames as StoryboardExportFrame[]
        const layout = (req.data.layout as StoryboardExportLayout) || 'grid3'
        const baseName = (req.data.baseName as string) || 'storyboard'
        const outputPath = await exportStoryboardPng(utilityUserDataPath, frames, layout, baseName)
        post('storyboard:exportResult', { outputPath, format: 'png' }, req.id)
        break
      }
      case 'storyboard:exportFrame4k': {
        const imagePath = req.data.imagePath as string
        const sequence = (req.data.sequence as number) || 1
        const outputPath = await exportFrame4k(utilityUserDataPath, imagePath, sequence)
        post('storyboard:exportResult', { outputPath, format: 'frame4k' }, req.id)
        break
      }
      default:
        post('storyboard:error', { error: `Unknown storyboard channel: ${req.channel}` }, req.id)
    }
  } catch (error) {
    post(
      'storyboard:error',
      { error: error instanceof Error ? error.message : String(error) },
      req.id,
    )
  }
}

async function handleAudioRequest(req: UtilityRequest): Promise<void> {
  try {
    await detectFFmpeg(currentConfig?.settings.ffmpeg_path)

    switch (req.channel) {
      case 'audio:checkDemucs': {
        const demucsPath = req.data.demucsPath as string | undefined
        const available = await detectDemucs(demucsPath)
        post('audio:checkDemucsResult', { available }, req.id)
        break
      }
      case 'audio:separateVocals': {
        const inputPath = req.data.inputPath as string
        const result = await separateVocals(inputPath, utilityUserDataPath, {
          demucsPath: req.data.demucsPath as string | undefined,
          apiEndpoint: req.data.apiEndpoint as string | undefined,
          apiKey: req.data.apiKey as string | undefined,
        })
        post('audio:separateResult', result, req.id)
        break
      }
      default:
        post('audio:error', { error: `Unknown audio channel: ${req.channel}` }, req.id)
    }
  } catch (error) {
    post(
      'audio:error',
      { error: error instanceof Error ? error.message : String(error) },
      req.id,
    )
  }
}

function handleAgentRequest(req: UtilityRequest): void {
  if (!adapters || !currentConfig) {
    post('agent:error', { error: 'Utility process not initialized' }, req.id)
    return
  }

  switch (req.channel) {
    case 'agent:chat': {
      void (async () => {
        try {
          const result = await agentChat(adapters!, currentConfig!, {
            message: req.data.message as string,
            disabledSkills: req.data.disabledSkills as string[] | undefined,
          })
          post('agent:result', result, req.id)
        } catch (error) {
          post('agent:error', { error: getAdapterErrorMessage(error) }, req.id)
        }
      })()
      break
    }
    case 'agent:listSkills': {
      post('agent:skills', { skills: listSkills() }, req.id)
      break
    }
    default:
      post('agent:error', { error: `Unknown agent channel: ${req.channel}` }, req.id)
  }
}

function handleRequest(req: UtilityRequest): void {
  if (req.channel.startsWith('ffmpeg:')) {
    void handleFfmpegRequest(req)
    return
  }
  if (req.channel.startsWith('compose:')) {
    void handleComposeRequest(req)
    return
  }
  if (req.channel.startsWith('agent:')) {
    void handleAgentRequest(req)
    return
  }
  if (req.channel.startsWith('storyboard:')) {
    void handleStoryboardRequest(req)
    return
  }
  if (req.channel.startsWith('audio:')) {
    void handleAudioRequest(req)
    return
  }

  if (!taskQueue || !adapters) {
    post('model:error', { error: 'Utility process not initialized' }, req.id)
    return
  }

  switch (req.channel) {
    case 'config:reload': {
      const configPath = req.data.configPath as string
      const reloaded = loadConfigFromPath(configPath, currentConfig?.settings.output_dir ?? '')
      currentConfig = reloaded
      initFfmpegPaths(utilityUserDataPath, reloaded.settings.ffmpeg_path)
      adapters.reloadFromConfig(reloaded)
      taskQueue.setMaxConcurrent(reloaded.settings.max_concurrent_tasks || 3)
      post('config:reloaded', {}, req.id)
      break
    }
    case 'model:generateScript': {
      void (async () => {
        try {
          const result = await generateScriptFromStory(
            adapters,
            req.data.modelId as string,
            req.data.storyInput as string,
            req.data.characterInput as string | undefined,
          )
          post('model:scriptResult', result, req.id)
        } catch (error) {
          post('model:error', { error: getAdapterErrorMessage(error) }, req.id)
        }
      })()
      break
    }
    case 'model:batchGenerateImages': {
      void (async () => {
        try {
          const scriptNodeId = req.data.scriptNodeId as string
          const tasks = req.data.tasks as Parameters<typeof batchGenerateImages>[3]
          const maxConcurrent = Math.min(
            currentConfig?.settings.max_concurrent_tasks ||
              (req.data.maxConcurrent as number) ||
              3,
            2,
          )
          const results = await batchGenerateImages(
            adapters,
            req.data.modelId as string,
            scriptNodeId,
            tasks,
            maxConcurrent,
            (completed, total, sequence) => {
              post('model:progress', {
                nodeId: scriptNodeId,
                percentage: Math.round((completed / total) * 100),
                batchSequence: sequence,
              })
            },
            (item) => {
              const task = tasks.find((t) => t.sequence === item.sequence)
              post('model:batchItemComplete', {
                scriptNodeId,
                type: 'image',
                sequence: item.sequence,
                result: item.result,
                modelId: req.data.modelId,
                prompt: task?.prompt ?? '',
              })
            },
          )
          post('model:batchResult', { scriptNodeId, results }, req.id)
        } catch (error) {
          post('model:error', { error: getAdapterErrorMessage(error) }, req.id)
        }
      })()
      break
    }
    case 'model:batchGenerateVideos': {
      void (async () => {
        try {
          const scriptNodeId = req.data.scriptNodeId as string
          const tasks = req.data.tasks as Parameters<typeof batchGenerateVideos>[3]
          const maxConcurrent =
            currentConfig?.settings.max_concurrent_tasks ||
            (req.data.maxConcurrent as number) ||
            3
          const results = await batchGenerateVideos(
            adapters,
            req.data.modelId as string,
            scriptNodeId,
            tasks,
            maxConcurrent,
            (completed, total, sequence) => {
              post('model:progress', {
                nodeId: scriptNodeId,
                percentage: Math.round((completed / total) * 100),
                batchSequence: sequence,
              })
            },
            (item) => {
              const task = tasks.find((t) => t.sequence === item.sequence)
              post('model:batchItemComplete', {
                scriptNodeId,
                type: 'video',
                sequence: item.sequence,
                result: item.result,
                modelId: req.data.modelId,
                prompt: task?.prompt ?? '',
              })
            },
          )
          post('model:batchResult', { scriptNodeId, results }, req.id)
        } catch (error) {
          post('model:error', { error: getAdapterErrorMessage(error) }, req.id)
        }
      })()
      break
    }
    case 'model:generateImage': {
      const params = req.data.params as GenerateImageParams
      const modelId = req.data.modelId as string
      const nodeId = req.data.nodeId as string
      const taskId = createTaskId()
      taskQueue.enqueue({
        id: taskId,
        type: 'image',
        nodeId,
        modelId,
        params: params as unknown as Record<string, unknown>,
      })
      post('model:enqueued', { taskId, nodeId }, req.id)
      break
    }
    case 'model:generateVideo': {
      const params = req.data.params as GenerateVideoParams
      const modelId = req.data.modelId as string
      const nodeId = req.data.nodeId as string
      const taskId = createTaskId()
      taskQueue.enqueue({
        id: taskId,
        type: 'video',
        nodeId,
        modelId,
        params: params as unknown as Record<string, unknown>,
      })
      post('model:enqueued', { taskId, nodeId }, req.id)
      break
    }
    case 'model:generateText': {
      const params = req.data.params as GenerateTextParams
      const modelId = req.data.modelId as string
      const nodeId = (req.data.nodeId as string) || ''
      const taskId = createTaskId()
      taskQueue.enqueue({
        id: taskId,
        type: 'text',
        nodeId,
        modelId,
        params: params as unknown as Record<string, unknown>,
      })
      post('model:enqueued', { taskId, nodeId }, req.id)
      break
    }
    case 'model:generateAudio': {
      const params = req.data.params as GenerateAudioParams
      const modelId = req.data.modelId as string
      const nodeId = req.data.nodeId as string
      const taskId = createTaskId()
      taskQueue.enqueue({
        id: taskId,
        type: 'audio',
        nodeId,
        modelId,
        params: params as unknown as Record<string, unknown>,
      })
      post('model:enqueued', { taskId, nodeId }, req.id)
      break
    }
    case 'model:cancel': {
      taskQueue.cancel(req.data.taskId as string)
      post('model:cancelled', { taskId: req.data.taskId }, req.id)
      break
    }
    default:
      post('model:error', { error: `Unknown channel: ${req.channel}` }, req.id)
  }
}

process.parentPort?.on('message', (event: { data: InitMessage | UtilityRequest }) => {
  const msg = event.data
  if ('type' in msg && msg.type === 'init') {
    initUtility(msg)
    return
  }
  handleRequest(msg as UtilityRequest)
})

post('utility:starting', {})
