import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
import { parse, stringify } from 'yaml'
import axios from 'axios'
import type { AppConfig, ConnectionTestResult, VideoModelConfig, ImageModelConfig } from '../../../src/types/config'
import { DEFAULT_SEEDANCE_VIDEO_MODEL, SEEDANCE_ENDPOINTS } from '../../../src/constants/seedance'
import { DEFAULT_SEEDREAM_IMAGE_MODEL } from '../../../src/constants/seedream'
import { buildDefaultSeedanceVideoModels, buildDefaultImageModels } from '../../../src/constants/modelPresets'
import { logger } from './logger'

export function getConfigPath(): string {
  return join(app.getPath('userData'), 'LocalCanvas', 'config.yaml')
}

function createDefaultConfig(): AppConfig {
  const home = app.getPath('home')
  return {
    image_models: buildDefaultImageModels(),
    video_models: buildDefaultSeedanceVideoModels(),
    llm_models: [],
    tts_models: [],
    settings: {
      default_image_model: DEFAULT_SEEDREAM_IMAGE_MODEL.id,
      default_video_model: DEFAULT_SEEDANCE_VIDEO_MODEL.id,
      default_llm: '',
      default_tts: '',
      output_dir: join(home, 'LocalCanvas', 'outputs'),
      temp_dir: join(home, 'LocalCanvas', '.temp'),
      max_concurrent_tasks: 3,
      auto_save_interval: 30,
      ffmpeg_path: '',
      onboarding_completed: false,
    },
  }
}

export function configFileExists(): boolean {
  return existsSync(getConfigPath())
}

export function needsOnboarding(): boolean {
  if (!configFileExists()) return true
  try {
    const raw = readFileSyncSafe()
    if (!raw) return true
    const parsed = parse(raw) as Partial<AppConfig>
    if (parsed.settings?.onboarding_completed) return false
    return (parsed.llm_models?.length ?? 0) === 0
  } catch {
    return true
  }
}

function readFileSyncSafe(): string | null {
  const path = getConfigPath()
  if (!existsSync(path)) return null
  return readFileSync(path, 'utf-8')
}

function replaceEnvVars<T>(obj: T): T {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}]+)\}/g, (_, varName: string) => process.env[varName] ?? '') as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => replaceEnvVars(item)) as T
  }
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(obj)) {
      result[key] = replaceEnvVars((obj as Record<string, unknown>)[key])
    }
    return result as T
  }
  return obj
}

async function ensureConfigDir(): Promise<void> {
  const dir = join(getConfigPath(), '..')
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
}

function sanitizeModelDefaults(config: AppConfig): AppConfig {
  const pickDefault = (models: { id: string }[], current: string | undefined) => {
    if (current && models.some((m) => m.id === current)) return current
    return models[0]?.id ?? ''
  }

  return {
    ...config,
    settings: {
      ...config.settings,
      default_image_model: pickDefault(config.image_models, config.settings.default_image_model),
      default_video_model: pickDefault(config.video_models, config.settings.default_video_model),
      default_llm: pickDefault(config.llm_models, config.settings.default_llm),
      default_tts: pickDefault(config.tts_models, config.settings.default_tts),
    },
  }
}

export async function readConfig(): Promise<AppConfig> {
  const defaults = createDefaultConfig()
  if (!existsSync(getConfigPath())) {
    return defaults
  }

  try {
    const raw = await readFile(getConfigPath(), 'utf-8')
    const parsed = parse(raw) as Partial<AppConfig>
    const merged: AppConfig = sanitizeModelDefaults({
      image_models: parsed.image_models ?? defaults.image_models,
      video_models: parsed.video_models ?? defaults.video_models,
      llm_models: parsed.llm_models ?? defaults.llm_models,
      tts_models: parsed.tts_models ?? defaults.tts_models,
      settings: { ...defaults.settings, ...parsed.settings },
    })
    return replaceEnvVars(merged)
  } catch (error) {
    logger.warn('Failed to read config.yaml', error)
    return defaults
  }
}

/** 若 config.yaml 不存在则写入默认配置（Utility Process 启动前调用） */
export async function ensureConfigFile(): Promise<AppConfig> {
  if (!existsSync(getConfigPath())) {
    const defaults = createDefaultConfig()
    await writeConfig(defaults)
    logger.info('Created default config.yaml')
    return replaceEnvVars(defaults)
  }
  return readConfig()
}

/** Read config without env var substitution (for writing back to disk) */
export async function readConfigRaw(): Promise<AppConfig> {
  const defaults = createDefaultConfig()
  if (!existsSync(getConfigPath())) {
    return defaults
  }
  const raw = await readFile(getConfigPath(), 'utf-8')
  const parsed = parse(raw) as Partial<AppConfig>
  return sanitizeModelDefaults({
    image_models: parsed.image_models ?? defaults.image_models,
    video_models: parsed.video_models ?? defaults.video_models,
    llm_models: parsed.llm_models ?? defaults.llm_models,
    tts_models: parsed.tts_models ?? defaults.tts_models,
    settings: { ...defaults.settings, ...parsed.settings },
  })
}

export async function writeConfig(config: AppConfig): Promise<void> {
  await ensureConfigDir()
  const content = stringify(config, { lineWidth: 0 })
  await writeFile(getConfigPath(), content, 'utf-8')
}

export async function testConnection(
  provider: string,
  endpoint: string,
  apiKey?: string,
): Promise<ConnectionTestResult> {
  if (!apiKey?.trim()) {
    return { ok: false, message: '请填写 API Key' }
  }

  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` }

    if (provider === 'volcengine_seedance') {
      await axios.get(SEEDANCE_ENDPOINTS.models, { headers, timeout: 10000 })
      return { ok: true, message: 'Seedance API 连接成功' }
    }

    if (endpoint.includes('/images/generations') && apiKey?.trim()) {
      await axios.get(SEEDANCE_ENDPOINTS.models, { headers, timeout: 10000 })
      return { ok: true, message: 'Seedream API 连接成功' }
    }

    const modelsUrl = endpoint.replace(
      /\/(chat\/completions|images\/generations|video-synthesis|text2speech\/synthesis|contents\/generations\/tasks).*$/,
      '/models',
    )

    if (modelsUrl !== endpoint) {
      await axios.get(modelsUrl, { headers, timeout: 10000 })
      return { ok: true, message: '连接成功' }
    }

    await axios.get(endpoint, {
      headers,
      timeout: 10000,
      validateStatus: (status) => status < 500,
    })
    return { ok: true, message: '端点可达' }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '连接失败'
    if (message.includes('401') || message.includes('403')) {
      return { ok: false, message: 'API Key 无效或无权访问' }
    }
    return { ok: false, message }
  }
}

