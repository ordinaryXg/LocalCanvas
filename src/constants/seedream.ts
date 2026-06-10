import { SEEDANCE_API_BASE } from './seedance'

/** 火山方舟 Doubao Seedream 图像生成 */
export const SEEDREAM_ENDPOINTS = {
  generate: `${SEEDANCE_API_BASE}/images/generations`,
} as const

/** Seedream 4.5 — 当前默认 */
export const SEEDREAM_MODEL_4_5 = 'doubao-seedream-4-5-251128'

/** Seedream 4.0 */
export const SEEDREAM_MODEL_4_0 = 'doubao-seedream-4-0-250828'

/** Seedream 5.0 Lite — 方舟 images/generations（官方 ID 带日期后缀） */
export const SEEDREAM_MODEL_5_0_LITE = 'doubao-seedream-5-0-260128'

/** 文档/第三方别名，调用时方舟可能仍接受 */
export const SEEDREAM_MODEL_5_0_LITE_ALIASES = [
  'doubao-seedream-5.0-lite',
  'doubao-seedream-5-0-lite-260128',
] as const

export const SEEDREAM_4_5_IMAGE_MODEL = {
  id: 'seedream-4-5',
  name: 'Doubao Seedream 4.5',
  provider: 'openai_compatible' as const,
  endpoint: SEEDREAM_ENDPOINTS.generate,
  model: SEEDREAM_MODEL_4_5,
  envKey: 'ARK_API_KEY',
  supported_sizes: ['2K', '4K', '2560x1440', '1440x2560', '1920x1920'],
  default_params: {
    response_format: 'url',
    watermark: false,
    sequential_image_generation: 'disabled',
  },
}

export const SEEDREAM_4_0_IMAGE_MODEL = {
  id: 'seedream-4-0',
  name: 'Doubao Seedream 4.0',
  provider: 'openai_compatible' as const,
  endpoint: SEEDREAM_ENDPOINTS.generate,
  model: SEEDREAM_MODEL_4_0,
  envKey: 'ARK_API_KEY',
  supported_sizes: ['2K', '4K', '2560x1440', '1440x2560', '1920x1920'],
  default_params: {
    response_format: 'url',
    watermark: false,
    sequential_image_generation: 'disabled',
  },
}

export const SEEDREAM_5_0_LITE_IMAGE_MODEL = {
  id: 'seedream-5-0-lite',
  name: 'Doubao Seedream 5.0 Lite',
  provider: 'openai_compatible' as const,
  endpoint: SEEDREAM_ENDPOINTS.generate,
  model: SEEDREAM_MODEL_5_0_LITE,
  envKey: 'ARK_API_KEY',
  supported_sizes: ['2K', '3K', '2560x1440', '1440x2560', '1920x1920', '3072x3072'],
  default_params: {
    response_format: 'url',
    watermark: false,
    sequential_image_generation: 'disabled',
  },
}

/** 默认图像模型 */
export const DEFAULT_SEEDREAM_IMAGE_MODEL = SEEDREAM_4_5_IMAGE_MODEL

/** Seedream 4.5 最小像素数（约 2560×1440） */
export const SEEDREAM_45_MIN_PIXELS = 3_686_400

const SEEDREAM_SIZE_16_9 = '2560x1440'
const SEEDREAM_SIZE_9_16 = '1440x2560'
const SEEDREAM_SIZE_1_1 = '1920x1920'

export function isSeedreamModel(apiModelId: string): boolean {
  return /seedream/i.test(apiModelId)
}

export function isSeedream45OrNewer(apiModelId: string): boolean {
  return /seedream-4-5|seedream-5-0|seedream-5\.0|4-5-251|5-0-26|5\.0-lite/i.test(apiModelId)
}

/** 将画布宽高映射为 Seedream size 参数（满足方舟最小分辨率） */
export function mapSizeForSeedream(
  width: number,
  height: number,
  apiModelId?: string,
): string {
  const w = Math.max(1, width)
  const h = Math.max(1, height)
  const pixels = w * h

  if (isSeedream45OrNewer(apiModelId ?? '') || pixels < SEEDREAM_45_MIN_PIXELS) {
    const ratio = w / h
    if (ratio > 1.2) return SEEDREAM_SIZE_16_9
    if (ratio < 0.83) return SEEDREAM_SIZE_9_16
    return SEEDREAM_SIZE_1_1
  }

  const maxSide = Math.max(w, h)
  if (maxSide >= 3840) return '4K'
  if (maxSide >= 1920) return '2K'
  return `${w}x${h}`
}
