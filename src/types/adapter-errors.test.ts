import { describe, expect, it } from 'vitest'
import { AdapterError, AdapterErrorCode, formatErrorMessage } from '../types/adapter-errors'

describe('formatErrorMessage', () => {
  it('maps ETIMEDOUT to user-friendly text', () => {
    expect(formatErrorMessage(new Error('connect ETIMEDOUT 118.196.65.58:443'))).toContain('超时')
  })

  it('uses AdapterError userMessage', () => {
    const err = new AdapterError(
      'technical',
      'custom',
      AdapterErrorCode.CONNECTION_TIMEOUT,
      true,
      '连接自定义 API 超时',
    )
    expect(formatErrorMessage(err)).toBe('连接自定义 API 超时')
  })
})
