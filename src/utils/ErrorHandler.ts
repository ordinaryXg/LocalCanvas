import { AdapterError, AdapterErrorCode, ADAPTER_USER_MESSAGES } from '../types/adapter-errors'
import { t } from '../i18n'

export enum ErrorCategory {
  NETWORK = 'network',
  MODEL_API = 'model_api',
  FILE_SYSTEM = 'file_system',
  DATABASE = 'database',
  FFMPEG = 'ffmpeg',
  UNKNOWN = 'unknown',
}

export class AppError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public userMessage: string,
    public retryable = false,
    public cause?: Error,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

type ToastHandler = (message: string, type: 'error' | 'info') => void

let toastHandler: ToastHandler | null = null

export function setToastHandler(handler: ToastHandler): void {
  toastHandler = handler
}

export function showToast(message: string, type: 'error' | 'info' = 'error'): void {
  toastHandler?.(message, type)
}

function resolveAdapterMessage(error: AdapterError): string {
  const key = `error.${error.code}`
  const translated = t(key)
  if (translated !== key) return translated
  return ADAPTER_USER_MESSAGES[error.code] || error.userMessage
}

export function handleError(error: unknown, context?: string): void {
  console.error('[ErrorHandler]', context, error)

  if (error instanceof AdapterError) {
    const hint = getCapabilityProbeHint(error)
    toastHandler?.(
      hint ? `${resolveAdapterMessage(error)}。${hint}` : resolveAdapterMessage(error),
      'error',
    )
    return
  }

  if (error instanceof AppError) {
    toastHandler?.(error.userMessage, 'error')
    return
  }

  if (error instanceof Error) {
    toastHandler?.(error.message || t('error.UNKNOWN'), 'error')
    return
  }

  toastHandler?.(t('error.UNKNOWN'), 'error')
}

/** 生成失败时若疑似能力不匹配，提示用户去设置页探测 */
export function getCapabilityProbeHint(error: unknown): string | null {
  const text = error instanceof Error ? error.message : String(error)
  if (
    /unsupported.*multimodal|invalid_image|image.*not.*support|不支持.*图|参考图|multimodal/i.test(
      text,
    )
  ) {
    return '能力可能不匹配，请在「设置 → 已接入模型」对该模型点击「验证能力」'
  }
  return null
}

export function getErrorMessage(error: unknown): string {
  return formatErrorMessage(error)
}

/** Document alias: RATE_LIMITED maps to QUOTA_EXCEEDED messaging */
export const ERROR_CODE_ALIASES: Partial<Record<string, AdapterErrorCode>> = {
  RATE_LIMITED: AdapterErrorCode.QUOTA_EXCEEDED,
  CONNECTION_FAILED: AdapterErrorCode.CONNECTION_REFUSED,
}
