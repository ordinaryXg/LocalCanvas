import { describe, expect, it } from 'vitest'
import {
  AuthValidationError,
  normalizeLoginUsername,
  validateRegistrationInput,
} from './authValidation'

describe('validateRegistrationInput', () => {
  it('accepts valid username and password', () => {
    expect(() => validateRegistrationInput('alice', 'password1')).not.toThrow()
  })

  it('rejects short username', () => {
    expect(() => validateRegistrationInput('a', 'password1')).toThrow(AuthValidationError)
    try {
      validateRegistrationInput('a', 'password1')
    } catch (err) {
      expect(err).toBeInstanceOf(AuthValidationError)
      expect((err as AuthValidationError).code).toBe('USERNAME_TOO_SHORT')
    }
  })

  it('rejects short password', () => {
    expect(() => validateRegistrationInput('alice', 'short')).toThrow(AuthValidationError)
    try {
      validateRegistrationInput('alice', 'short')
    } catch (err) {
      expect((err as AuthValidationError).code).toBe('PASSWORD_TOO_SHORT')
    }
  })
})

describe('normalizeLoginUsername', () => {
  it('trims whitespace', () => {
    expect(normalizeLoginUsername('  bob  ')).toBe('bob')
  })
})
