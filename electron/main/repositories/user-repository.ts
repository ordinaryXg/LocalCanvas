import { getDatabase, type IRepository } from '../database'
import { v4 as uuid } from 'uuid'

export interface User {
  id: string
  username: string
  email?: string
  passwordHash: string
  displayName?: string
  avatarPath?: string
  preferences?: Record<string, unknown>
  syncStatus: 'local' | 'pending' | 'synced'
  cloudUserId?: string
  createdAt: string
  updatedAt: string
}

export interface UserSession {
  id: string
  userId: string
  tokenHash: string
  expiresAt: string
  createdAt: string
}

export type PublicUser = Omit<User, 'passwordHash'>

export class UserRepository implements IRepository<User> {
  findById(id: string): User | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.rowToEntity(row) : null
  }

  findByUsername(username: string): User | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
      | Record<string, unknown>
      | undefined
    return row ? this.rowToEntity(row) : null
  }

  findAll(): User[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as Record<string, unknown>[]
    return rows.map((r) => this.rowToEntity(r))
  }

  create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): string {
    const db = getDatabase()
    const id = uuid()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, display_name, avatar_path,
        preferences, sync_status, cloud_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.username,
      data.email ?? null,
      data.passwordHash,
      data.displayName ?? data.username,
      data.avatarPath ?? null,
      data.preferences ? JSON.stringify(data.preferences) : null,
      data.syncStatus,
      data.cloudUserId ?? null,
      now,
      now,
    )
    return id
  }

  update(id: string, updates: Partial<User>): void {
    const db = getDatabase()
    const sets: string[] = []
    const values: unknown[] = []

    if (updates.email !== undefined) {
      sets.push('email = ?')
      values.push(updates.email)
    }
    if (updates.displayName !== undefined) {
      sets.push('display_name = ?')
      values.push(updates.displayName)
    }
    if (updates.avatarPath !== undefined) {
      sets.push('avatar_path = ?')
      values.push(updates.avatarPath)
    }
    if (updates.preferences !== undefined) {
      sets.push('preferences = ?')
      values.push(JSON.stringify(updates.preferences))
    }
    if (updates.syncStatus !== undefined) {
      sets.push('sync_status = ?')
      values.push(updates.syncStatus)
    }
    if (updates.cloudUserId !== undefined) {
      sets.push('cloud_user_id = ?')
      values.push(updates.cloudUserId)
    }
    if (sets.length === 0) return

    sets.push("updated_at = datetime('now')")
    values.push(id)
    db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  }

  delete(id: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM users WHERE id = ?').run(id)
  }

  createSession(userId: string, tokenHash: string, expiresAt: string): string {
    const db = getDatabase()
    const id = uuid()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, tokenHash, expiresAt, now)
    return id
  }

  findSessionById(sessionId: string): UserSession | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM user_sessions WHERE id = ?').get(sessionId) as
      | Record<string, unknown>
      | undefined
    if (!row) return null
    return {
      id: row.id as string,
      userId: row.user_id as string,
      tokenHash: row.token_hash as string,
      expiresAt: row.expires_at as string,
      createdAt: row.created_at as string,
    }
  }

  deleteSession(sessionId: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM user_sessions WHERE id = ?').run(sessionId)
  }

  deleteSessionsForUser(userId: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId)
  }

  toPublic(user: User): PublicUser {
    const { passwordHash: _, ...rest } = user
    return rest
  }

  private rowToEntity(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      username: row.username as string,
      email: (row.email as string) || undefined,
      passwordHash: row.password_hash as string,
      displayName: (row.display_name as string) || undefined,
      avatarPath: (row.avatar_path as string) || undefined,
      preferences: row.preferences ? JSON.parse(row.preferences as string) : undefined,
      syncStatus: row.sync_status as User['syncStatus'],
      cloudUserId: (row.cloud_user_id as string) || undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}

export const userRepository = new UserRepository()
