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

export function handleError(error: unknown, context?: string): void {
  console.error('[ErrorHandler]', context, error)

  if (error instanceof AppError) {
    toastHandler?.(error.userMessage, 'error')
    return
  }

  if (error instanceof Error) {
    toastHandler?.(error.message || '操作失败，请重试', 'error')
    return
  }

  toastHandler?.('操作失败，请重试', 'error')
}
