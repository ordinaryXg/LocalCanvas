export enum AdapterErrorCode {
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  MODEL_LOADING = 'MODEL_LOADING',
  MODEL_ERROR = 'MODEL_ERROR',
  QUEUE_FULL = 'QUEUE_FULL',
  AUTH_FAILED = 'AUTH_FAILED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_PARAMS = 'INVALID_PARAMS',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
  UNKNOWN = 'UNKNOWN',
}

export class AdapterError extends Error {
  constructor(
    message: string,
    public adapterType: 'openai' | 'custom',
    public code: AdapterErrorCode,
    public retryable: boolean,
    public userMessage: string,
    cause?: Error,
  ) {
    super(message)
    this.name = 'AdapterError'
    if (cause) this.cause = cause
  }
}

export function formatNetworkErrorText(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ADAPTER_USER_MESSAGES[AdapterErrorCode.UNKNOWN]
  if (/ETIMEDOUT|ECONNABORTED/i.test(trimmed)) {
    return '连接模型服务超时，请检查网络、代理/VPN，或在设置 → 已接入模型中测试 API 连接'
  }
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(trimmed)) {
    return '无法连接模型服务，请检查设置中的 API 地址与网络'
  }
  if (/ECONNRESET/i.test(trimmed)) {
    return ADAPTER_USER_MESSAGES[AdapterErrorCode.NETWORK_ERROR]
  }
  return trimmed
}

export function formatErrorMessage(error: unknown): string {
  if (error instanceof AdapterError) return error.userMessage
  if (error instanceof Error) return formatNetworkErrorText(error.message)
  return formatNetworkErrorText(String(error))
}

export function getAdapterErrorMessage(error: unknown): string {
  return formatErrorMessage(error)
}

export const ADAPTER_USER_MESSAGES: Record<AdapterErrorCode, string> = {
  [AdapterErrorCode.CONNECTION_REFUSED]: '无法连接到模型服务，请检查地址是否正确',
  [AdapterErrorCode.CONNECTION_TIMEOUT]: '连接超时，请检查网络或增加超时时间',
  [AdapterErrorCode.NETWORK_ERROR]: '网络异常，请检查网络连接',
  [AdapterErrorCode.MODEL_NOT_FOUND]: '模型不存在，请检查模型 ID',
  [AdapterErrorCode.MODEL_LOADING]: '模型加载中，请稍后重试',
  [AdapterErrorCode.MODEL_ERROR]: '模型运行出错，请调整参数后重试',
  [AdapterErrorCode.QUEUE_FULL]: '服务端队列已满，请稍后重试',
  [AdapterErrorCode.AUTH_FAILED]: '认证失败，请检查 API Key',
  [AdapterErrorCode.QUOTA_EXCEEDED]: '配额或余额不足，请充值或更换 API Key 后重试',
  [AdapterErrorCode.INVALID_PARAMS]: '参数校验失败，请检查输入',
  [AdapterErrorCode.UNSUPPORTED_OPERATION]: '当前适配器不支持此操作',
  [AdapterErrorCode.UNKNOWN]: '未知错误，请查看日志',
}
