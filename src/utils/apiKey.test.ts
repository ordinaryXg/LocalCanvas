import { describe, expect, it } from 'vitest'
import { hasUsableApiKey, isAuthRelatedMessage, sanitizeApiKey } from './apiKey'

describe('sanitizeApiKey', () => {
  it('trims and strips quotes', () => {
    expect(sanitizeApiKey('  "abc-key-123"  ')).toBe('abc-key-123')
  })
})

describe('hasUsableApiKey', () => {
  it('rejects empty and placeholders', () => {
    expect(hasUsableApiKey('')).toBe(false)
    expect(hasUsableApiKey('sk-xxx')).toBe(false)
  })

  it('accepts normal keys', () => {
    expect(hasUsableApiKey('02178108439607279be1521b480472bd1aa7097703cfa203a5efd')).toBe(true)
  })
})

describe('isAuthRelatedMessage', () => {
  it('detects api key errors', () => {
    expect(isAuthRelatedMessage('The API key format is incorrect')).toBe(true)
  })
})
