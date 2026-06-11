import { describe, expect, it } from 'vitest'
import { hasUsableApiKey, isAuthRelatedMessage, resolveFirstUsableApiKey, sanitizeApiKey } from './apiKey'

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

describe('resolveFirstUsableApiKey', () => {
  it('returns first valid key and skips duplicates', () => {
    expect(resolveFirstUsableApiKey('', 'sk-xxx', 'ark-valid-key-12345678', 'ark-valid-key-12345678')).toBe(
      'ark-valid-key-12345678',
    )
  })
})

describe('isAuthRelatedMessage', () => {
  it('detects api key errors', () => {
    expect(isAuthRelatedMessage('The API key format is incorrect')).toBe(true)
  })
})
