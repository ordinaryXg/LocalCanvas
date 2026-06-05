interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  retryableErrors: string[]
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'rate_limit', '429', '503', '502'],
}

function getRetryAfterMs(err: unknown): number | undefined {
  const response = (err as { response?: { status?: number; headers?: Record<string, string> } })
    ?.response
  if (response?.status !== 429) return undefined

  const retryAfter =
    response.headers?.['retry-after'] ?? response.headers?.['Retry-After']
  if (!retryAfter) return undefined

  const seconds = parseInt(retryAfter, 10)
  if (!Number.isNaN(seconds)) return Math.min(seconds * 1000, DEFAULT_CONFIG.maxDelay)

  const dateMs = Date.parse(retryAfter)
  if (!Number.isNaN(dateMs)) {
    return Math.min(Math.max(0, dateMs - Date.now()), DEFAULT_CONFIG.maxDelay)
  }

  return undefined
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: Error) => void,
): Promise<T> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      lastError = error

      const code = (err as { code?: string })?.code || ''
      const message = error.message || ''
      const isRetryable = cfg.retryableErrors.some(
        (keyword) => message.includes(keyword) || code.includes(keyword),
      )

      if (!isRetryable || attempt >= cfg.maxRetries) {
        throw lastError
      }

      const retryAfterMs = getRetryAfterMs(err)
      const delay =
        retryAfterMs ??
        Math.min(cfg.baseDelay * Math.pow(2, attempt), cfg.maxDelay)
      onRetry?.(attempt + 1, lastError)
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  throw lastError!
}
