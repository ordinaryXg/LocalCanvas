export class AuthValidationError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AuthValidationError'
  }
}

export function validateRegistrationInput(username: string, password: string): void {
  if (username.trim().length < 2) {
    throw new AuthValidationError('USERNAME_TOO_SHORT', '用户名至少 2 个字符')
  }
  if (password.length < 8) {
    throw new AuthValidationError('PASSWORD_TOO_SHORT', '密码至少 8 位')
  }
}

export function normalizeLoginUsername(username: string): string {
  return username.trim()
}
