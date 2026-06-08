import { describe, expect, it } from 'vitest'

export function validateRegisterInput(username: string, password: string): string | null {
  const trimmed = username.trim()
  if (trimmed.length < 2) return 'USERNAME_TOO_SHORT'
  if (password.length < 8) return 'PASSWORD_TOO_SHORT'
  return null
}

describe('validateRegisterInput', () => {
  it('rejects short username', () => {
    expect(validateRegisterInput('a', 'password1')).toBe('USERNAME_TOO_SHORT')
  })

  it('rejects short password', () => {
    expect(validateRegisterInput('alice', 'short')).toBe('PASSWORD_TOO_SHORT')
  })

  it('accepts valid input', () => {
    expect(validateRegisterInput('alice', 'password1')).toBeNull()
  })
})
