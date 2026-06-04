/** 火山方舟 Doubao Seedance — 官方 API 常量 */
export const SEEDANCE_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3'

export const SEEDANCE_ENDPOINTS = {
  createTask: `${SEEDANCE_API_BASE}/contents/generations/tasks`,
  pollTask: `${SEEDANCE_API_BASE}/contents/generations/tasks/{task_id}`,
  models: `${SEEDANCE_API_BASE}/models`,
} as const

/** 火山方舟控制台 — 开通模型 / 管理 API Key */
export const SEEDANCE_ARK_CONSOLE = {
  apiKey: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apikey',
  models: 'https://console.volcengine.com/ark/region:ark+cn-beijing/model',
} as const

/** Seedance 1.0 Pro Fast — 当前默认测试模型 */
export const SEEDANCE_MODEL_1_0_PRO_FAST = 'doubao-seedance-1-0-pro-fast-251015'

/** Seedance 2.0 标准版 */
export const SEEDANCE_MODEL_STANDARD = 'doubao-seedance-2-0-260128'
/** Seedance 2.0 快速版 */
export const SEEDANCE_MODEL_FAST = 'doubao-seedance-2-0-fast-260128'

export type SeedanceRatio = '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '1:1' | 'adaptive'
export type SeedanceResolution = '480p' | '720p' | '1080p' | '2K'

/** 文生视频（t2v）可用比例 — adaptive 仅用于图生视频 */
export const SEEDANCE_T2V_RATIOS: SeedanceRatio[] = ['16:9', '9:16', '4:3', '3:4', '21:9', '1:1']

export const SEEDANCE_RATIOS: SeedanceRatio[] = [...SEEDANCE_T2V_RATIOS, 'adaptive']
export const SEEDANCE_RESOLUTIONS: SeedanceResolution[] = ['480p', '720p', '1080p', '2K']
export const SEEDANCE_DURATIONS_V2 = [4, 5, 8, 10, 15] as const
export const SEEDANCE_DURATIONS_V1 = [2, 3, 4, 5, 8, 10, 12] as const
/** @deprecated 使用 getSeedanceCapabilities 获取版本对应时长 */
export const SEEDANCE_DURATIONS = SEEDANCE_DURATIONS_V2

/** 运镜描述追加到 prompt（Seedance 通过自然语言控制镜头） */
export const SEEDANCE_CAMERA_PROMPTS: Record<string, string> = {
  静止: 'static camera, fixed shot',
  左移: 'camera pan left, smooth tracking shot',
  右移: 'camera pan right, smooth tracking shot',
  推近: 'slow dolly in, push in shot',
  拉远: 'slow dolly out, pull back shot',
  环绕: 'orbiting camera, circular tracking shot',
}

export interface SeedanceCapabilities {
  version: '1.0' | '2.0'
  durations: readonly number[]
  resolutions: SeedanceResolution[]
  supportsGenerateAudio: boolean
  supportsLastFrame: boolean
  minDuration: number
  maxDuration: number
}

export function isSeedanceV2Model(apiModelId: string): boolean {
  return /seedance-2|2-0-\d+/i.test(apiModelId)
}

export function getSeedanceCapabilities(apiModelId: string): SeedanceCapabilities {
  if (isSeedanceV2Model(apiModelId)) {
    return {
      version: '2.0',
      durations: SEEDANCE_DURATIONS_V2,
      resolutions: ['480p', '720p', '1080p', '2K'],
      supportsGenerateAudio: true,
      supportsLastFrame: true,
      minDuration: 4,
      maxDuration: 15,
    }
  }
  return {
    version: '1.0',
    durations: SEEDANCE_DURATIONS_V1,
    resolutions: ['480p', '720p', '1080p'],
    supportsGenerateAudio: false,
    supportsLastFrame: false,
    minDuration: 2,
    maxDuration: 12,
  }
}

export const SEEDANCE_1_0_PRO_FAST_VIDEO_MODEL = {
  id: 'seedance-1-0-pro-fast',
  name: 'Doubao Seedance 1.0 Pro Fast',
  provider: 'volcengine_seedance' as const,
  endpoint: SEEDANCE_ENDPOINTS.createTask,
  poll_endpoint: SEEDANCE_ENDPOINTS.pollTask,
  model: SEEDANCE_MODEL_1_0_PRO_FAST,
  envKey: 'ARK_API_KEY',
  max_duration: 12,
  supported_resolutions: ['480p', '720p', '1080p'],
  default_params: {
    ratio: '16:9' as SeedanceRatio,
    resolution: '720p' as SeedanceResolution,
    generate_audio: false,
    watermark: false,
    version: '1.0',
  },
}

export const SEEDANCE_2_0_VIDEO_MODEL = {
  id: 'seedance-2-0',
  name: 'Doubao Seedance 2.0',
  provider: 'volcengine_seedance' as const,
  endpoint: SEEDANCE_ENDPOINTS.createTask,
  poll_endpoint: SEEDANCE_ENDPOINTS.pollTask,
  model: SEEDANCE_MODEL_STANDARD,
  envKey: 'ARK_API_KEY',
  max_duration: 15,
  supported_resolutions: ['480p', '720p', '1080p', '2K'],
  default_params: {
    ratio: '16:9' as SeedanceRatio,
    resolution: '1080p' as SeedanceResolution,
    generate_audio: true,
    watermark: false,
    version: '2.0',
  },
}

export const SEEDANCE_2_0_FAST_VIDEO_MODEL = {
  ...SEEDANCE_2_0_VIDEO_MODEL,
  id: 'seedance-2-0-fast',
  name: 'Doubao Seedance 2.0 Fast',
  model: SEEDANCE_MODEL_FAST,
  default_params: {
    ...SEEDANCE_2_0_VIDEO_MODEL.default_params,
    resolution: '720p' as SeedanceResolution,
  },
}

/** 当前默认视频模型（测试阶段使用 1.0 Pro Fast） */
export const DEFAULT_SEEDANCE_VIDEO_MODEL = SEEDANCE_1_0_PRO_FAST_VIDEO_MODEL

/** @deprecated 使用 SEEDANCE_2_0_VIDEO_MODEL */
export const SEEDANCE_FAST_VIDEO_MODEL = SEEDANCE_2_0_FAST_VIDEO_MODEL
