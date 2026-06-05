import { getDatabase, type IRepository } from '../database'
import { v4 as uuid } from 'uuid'
import { getCurrentUserId, GUEST_USER_ID, isGuestMode } from '../services/auth-service'

function userScopeClause(alias = ''): { sql: string; params: unknown[] } {
  const prefix = alias ? `${alias}.` : ''
  if (isGuestMode()) {
    return { sql: `(${prefix}user_id IS NULL OR ${prefix}user_id = ?)`, params: [GUEST_USER_ID] }
  }
  return { sql: `${prefix}user_id = ?`, params: [getCurrentUserId()] }
}

export interface Generation {
  id: string
  type: 'image' | 'video' | 'text' | 'audio'
  modelId: string
  modelName: string
  provider: string
  prompt: string
  negativePrompt?: string
  params?: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  outputPath?: string
  thumbnailPath?: string
  error?: string
  projectId?: string
  nodeId?: string
  durationMs?: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  updatedAt: string
}

export class GenerationRepository implements IRepository<Generation> {
  findById(id: string): Generation | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM generations WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.rowToEntity(row) : null
  }

  findAll(filter?: Partial<Generation>): Generation[] {
    const db = getDatabase()
    const conditions: string[] = []
    const params: unknown[] = []

    if (filter?.type) {
      conditions.push('type = ?')
      params.push(filter.type)
    }
    if (filter?.status) {
      conditions.push('status = ?')
      params.push(filter.status)
    }
    if (filter?.modelId) {
      conditions.push('model_id = ?')
      params.push(filter.modelId)
    }
    if (filter?.projectId) {
      conditions.push('project_id = ?')
      params.push(filter.projectId)
    }

    const scope = userScopeClause()
    conditions.push(scope.sql)
    params.push(...scope.params)

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = db
      .prepare(`SELECT * FROM generations ${where} ORDER BY created_at DESC`)
      .all(...params) as Record<string, unknown>[]
    return rows.map((r) => this.rowToEntity(r))
  }

  create(data: Omit<Generation, 'id' | 'createdAt' | 'updatedAt'>): string {
    const db = getDatabase()
    const id = uuid()
    const now = new Date().toISOString()

    const userId = isGuestMode() ? null : getCurrentUserId()

    db.prepare(`
      INSERT INTO generations (id, type, model_id, model_name, provider, prompt,
        negative_prompt, params, status, progress, output_path, thumbnail_path,
        error, project_id, node_id, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.type,
      data.modelId,
      data.modelName,
      data.provider,
      data.prompt,
      data.negativePrompt || null,
      JSON.stringify(data.params || {}),
      data.status,
      data.progress,
      data.outputPath || null,
      data.thumbnailPath || null,
      data.error || null,
      data.projectId || null,
      data.nodeId || null,
      userId,
      now,
      now,
    )

    return id
  }

  update(id: string, updates: Partial<Generation>): void {
    const db = getDatabase()
    const sets: string[] = []
    const values: unknown[] = []

    if (updates.status !== undefined) {
      sets.push('status = ?')
      values.push(updates.status)
    }
    if (updates.progress !== undefined) {
      sets.push('progress = ?')
      values.push(updates.progress)
    }
    if (updates.outputPath !== undefined) {
      sets.push('output_path = ?')
      values.push(updates.outputPath)
    }
    if (updates.thumbnailPath !== undefined) {
      sets.push('thumbnail_path = ?')
      values.push(updates.thumbnailPath)
    }
    if (updates.error !== undefined) {
      sets.push('error = ?')
      values.push(updates.error)
    }
    if (updates.startedAt !== undefined) {
      sets.push('started_at = ?')
      values.push(updates.startedAt)
    }
    if (updates.completedAt !== undefined) {
      sets.push('completed_at = ?')
      values.push(updates.completedAt)
    }
    if (updates.durationMs !== undefined) {
      sets.push('duration_ms = ?')
      values.push(updates.durationMs)
    }

    if (sets.length === 0) return

    sets.push("updated_at = datetime('now')")
    values.push(id)
    db.prepare(`UPDATE generations SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  }

  delete(id: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM generations WHERE id = ?').run(id)
  }

  search(query: string, type?: string, limit = 50, offset = 0): Generation[] {
    const db = getDatabase()
    const conditions = ['prompt LIKE ?']
    const params: unknown[] = [`%${query}%`]

    if (type && type !== 'all') {
      conditions.push('type = ?')
      params.push(type)
    }

    const scope = userScopeClause()
    conditions.push(scope.sql)
    params.push(...scope.params)

    params.push(limit, offset)
    const rows = db
      .prepare(
        `SELECT * FROM generations WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...params) as Record<string, unknown>[]
    return rows.map((r) => this.rowToEntity(r))
  }

  getStats(): { total: number; images: number; videos: number; texts: number; failed: number } {
    const db = getDatabase()
    const scope = userScopeClause()
    const where = `WHERE ${scope.sql}`
    const params = scope.params
    const total = (db.prepare(`SELECT COUNT(*) as count FROM generations ${where}`).get(...params) as { count: number })
      .count
    const images = (
      db.prepare(`SELECT COUNT(*) as count FROM generations ${where} AND type = 'image'`).get(...params) as {
        count: number
      }
    ).count
    const videos = (
      db.prepare(`SELECT COUNT(*) as count FROM generations ${where} AND type = 'video'`).get(...params) as {
        count: number
      }
    ).count
    const texts = (
      db.prepare(`SELECT COUNT(*) as count FROM generations ${where} AND type IN ('text', 'audio')`).get(...params) as {
        count: number
      }
    ).count
    const failed = (
      db.prepare(`SELECT COUNT(*) as count FROM generations ${where} AND status = 'failed'`).get(...params) as {
        count: number
      }
    ).count
    return { total, images, videos, texts, failed }
  }

  private rowToEntity(row: Record<string, unknown>): Generation {
    return {
      id: row.id as string,
      type: row.type as Generation['type'],
      modelId: row.model_id as string,
      modelName: (row.model_name as string) || '',
      provider: (row.provider as string) || '',
      prompt: (row.prompt as string) || '',
      negativePrompt: row.negative_prompt as string | undefined,
      params: row.params ? (JSON.parse(row.params as string) as Record<string, unknown>) : {},
      status: row.status as Generation['status'],
      progress: (row.progress as number) || 0,
      outputPath: row.output_path as string | undefined,
      thumbnailPath: row.thumbnail_path as string | undefined,
      error: row.error as string | undefined,
      projectId: row.project_id as string | undefined,
      nodeId: row.node_id as string | undefined,
      durationMs: row.duration_ms as number | undefined,
      createdAt: row.created_at as string,
      startedAt: row.started_at as string | undefined,
      completedAt: row.completed_at as string | undefined,
      updatedAt: row.updated_at as string,
    }
  }
}

let repo: GenerationRepository | null = null

export function getGenerationRepository(): GenerationRepository {
  if (!repo) repo = new GenerationRepository()
  return repo
}
