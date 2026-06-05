import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { userRepository, type PublicUser } from '../repositories/user-repository'
import { getDatabase } from '../database'
import { logger } from './logger'

export const GUEST_USER_ID = '__guest__'

export interface AuthSession {
  sessionId: string
  userId: string
  isGuest: boolean
}

export interface AuthResult {
  user: PublicUser | null
  session: AuthSession | null
  isGuest: boolean
}

const SESSION_DAYS = 30
const BCRYPT_ROUNDS = 10

let currentSession: AuthSession | null = null

function sessionFilePath(): string {
  const dir = join(app.getPath('userData'), 'LocalCanvas')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'session.json')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

function persistSessionFile(session: AuthSession | null): void {
  const path = sessionFilePath()
  if (!session) {
    if (existsSync(path)) writeFileSync(path, '{}', 'utf-8')
    return
  }
  writeFileSync(path, JSON.stringify({ sessionId: session.sessionId }), 'utf-8')
}

function loadSessionFile(): string | null {
  const path = sessionFilePath()
  if (!existsSync(path)) return null
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as { sessionId?: string }
    return data.sessionId ?? null
  } catch {
    return null
  }
}

export function getCurrentUserId(): string {
  if (!currentSession) return GUEST_USER_ID
  return currentSession.userId
}

export function getCurrentSession(): AuthSession | null {
  return currentSession
}

export function isGuestMode(): boolean {
  return !currentSession || currentSession.isGuest
}

export function restoreSession(): AuthResult {
  const sessionId = loadSessionFile()
  if (!sessionId) {
    currentSession = { sessionId: '', userId: GUEST_USER_ID, isGuest: true }
    return { user: null, session: currentSession, isGuest: true }
  }

  const row = userRepository.findSessionById(sessionId)
  if (!row || new Date(row.expiresAt) < new Date()) {
    if (row) userRepository.deleteSession(sessionId)
    persistSessionFile(null)
    currentSession = { sessionId: '', userId: GUEST_USER_ID, isGuest: true }
    return { user: null, session: currentSession, isGuest: true }
  }

  const user = userRepository.findById(row.userId)
  if (!user) {
    userRepository.deleteSession(sessionId)
    persistSessionFile(null)
    currentSession = { sessionId: '', userId: GUEST_USER_ID, isGuest: true }
    return { user: null, session: currentSession, isGuest: true }
  }

  currentSession = { sessionId, userId: user.id, isGuest: false }
  return { user: userRepository.toPublic(user), session: currentSession, isGuest: false }
}

export async function registerUser(
  username: string,
  password: string,
  email?: string,
): Promise<AuthResult> {
  const trimmed = username.trim()
  if (trimmed.length < 2) throw new AuthError('USERNAME_TOO_SHORT', '用户名至少 2 个字符')
  if (password.length < 8) throw new AuthError('PASSWORD_TOO_SHORT', '密码至少 8 位')
  if (userRepository.findByUsername(trimmed)) {
    throw new AuthError('USERNAME_TAKEN', '用户名已存在')
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const userId = userRepository.create({
    username: trimmed,
    email,
    passwordHash,
    displayName: trimmed,
    syncStatus: 'local',
  })

  return loginUser(trimmed, password)
}

export async function loginUser(username: string, password: string): Promise<AuthResult> {
  const user = userRepository.findByUsername(username.trim())
  if (!user) throw new AuthError('INVALID_CREDENTIALS', '用户名或密码错误')

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw new AuthError('INVALID_CREDENTIALS', '用户名或密码错误')

  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const sessionId = userRepository.createSession(user.id, hashToken(token), expiresAt)

  currentSession = { sessionId, userId: user.id, isGuest: false }
  persistSessionFile(currentSession)

  logger.info('User logged in', user.username)
  return {
    user: userRepository.toPublic(user),
    session: currentSession,
    isGuest: false,
  }
}

export function enterGuestMode(): AuthResult {
  if (currentSession?.sessionId) {
    userRepository.deleteSession(currentSession.sessionId)
  }
  currentSession = { sessionId: '', userId: GUEST_USER_ID, isGuest: true }
  persistSessionFile(null)
  return { user: null, session: currentSession, isGuest: true }
}

export function logoutUser(): AuthResult {
  if (currentSession?.sessionId) {
    userRepository.deleteSession(currentSession.sessionId)
  }
  return enterGuestMode()
}

export function updateProfile(updates: {
  displayName?: string
  email?: string
  avatarPath?: string
  preferences?: Record<string, unknown>
}): PublicUser {
  if (!currentSession || currentSession.isGuest) {
    throw new AuthError('NOT_AUTHENTICATED', '请先登录')
  }
  userRepository.update(currentSession.userId, updates)
  const user = userRepository.findById(currentSession.userId)
  if (!user) throw new AuthError('NOT_AUTHENTICATED', '用户不存在')
  return userRepository.toPublic(user)
}

export function getProfile(): PublicUser | null {
  if (!currentSession || currentSession.isGuest) return null
  const user = userRepository.findById(currentSession.userId)
  return user ? userRepository.toPublic(user) : null
}

/** 将无 user_id 的遗留数据绑定到当前登录用户 */
export function claimLegacyData(): number {
  if (!currentSession || currentSession.isGuest) return 0
  const db = getDatabase()
  const uid = currentSession.userId
  const claim = (table: string) => {
    const result = db
      .prepare(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`)
      .run(uid)
    return result.changes
  }
  return claim('projects') + claim('generations') + claim('workflows')
}

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
