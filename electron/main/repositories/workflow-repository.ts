import { getDatabase, type IRepository } from '../database'
import { v4 as uuid } from 'uuid'
import { getCurrentUserId, isGuestMode } from '../services/auth-service'

export interface Workflow {
  id: string
  name: string
  description?: string
  nodes: unknown[]
  edges: unknown[]
  thumbnailPath?: string
  isPreset: boolean
  createdAt: string
  updatedAt: string
}

export class WorkflowRepository implements IRepository<Workflow> {
  findById(id: string): Workflow | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.rowToEntity(row) : null
  }

  findAll(filter?: Partial<Workflow>): Workflow[] {
    const db = getDatabase()
    const conditions: string[] = []
    const params: unknown[] = []

    if (filter?.isPreset !== undefined) {
      conditions.push('is_preset = ?')
      params.push(filter.isPreset ? 1 : 0)
    }

    if (filter?.isPreset !== true) {
      if (isGuestMode()) {
        conditions.push('(user_id IS NULL OR is_preset = 1)')
      } else {
        conditions.push('(user_id = ? OR is_preset = 1)')
        params.push(getCurrentUserId())
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = db
      .prepare(`SELECT * FROM workflows ${where} ORDER BY updated_at DESC`)
      .all(...params) as Record<string, unknown>[]
    return rows.map((r) => this.rowToEntity(r))
  }

  create(data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): string {
    const db = getDatabase()
    const id = uuid()
    const now = new Date().toISOString()

    const userId = data.isPreset || isGuestMode() ? null : getCurrentUserId()

    db.prepare(`
      INSERT INTO workflows (id, name, description, nodes, edges, thumbnail_path, is_preset, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.description || null,
      JSON.stringify(data.nodes),
      JSON.stringify(data.edges),
      data.thumbnailPath || null,
      data.isPreset ? 1 : 0,
      userId,
      now,
      now,
    )

    return id
  }

  update(id: string, updates: Partial<Workflow>): void {
    const db = getDatabase()
    const sets: string[] = []
    const values: unknown[] = []

    if (updates.name !== undefined) {
      sets.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      sets.push('description = ?')
      values.push(updates.description)
    }
    if (updates.nodes !== undefined) {
      sets.push('nodes = ?')
      values.push(JSON.stringify(updates.nodes))
    }
    if (updates.edges !== undefined) {
      sets.push('edges = ?')
      values.push(JSON.stringify(updates.edges))
    }
    if (updates.thumbnailPath !== undefined) {
      sets.push('thumbnail_path = ?')
      values.push(updates.thumbnailPath)
    }

    if (sets.length === 0) return

    sets.push("updated_at = datetime('now')")
    values.push(id)
    db.prepare(`UPDATE workflows SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  }

  delete(id: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM workflows WHERE id = ?').run(id)
  }

  listSummaries(presetOnly?: boolean): Array<{
    id: string
    name: string
    description?: string
    isPreset: boolean
    updatedAt: string
  }> {
    const workflows = this.findAll(presetOnly !== undefined ? { isPreset: presetOnly } : undefined)
    return workflows.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      isPreset: w.isPreset,
      updatedAt: w.updatedAt,
    }))
  }

  exportJson(workflowId: string): string {
    const workflow = this.findById(workflowId)
    if (!workflow) throw new Error('Workflow not found')

    return JSON.stringify(
      {
        version: 1,
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    )
  }

  importJson(jsonStr: string): string {
    const data = JSON.parse(jsonStr) as {
      name?: string
      description?: string
      nodes?: unknown[]
      edges?: unknown[]
    }
    if (!data.nodes || !data.edges) throw new Error('Invalid workflow format')

    return this.create({
      name: data.name || 'Imported Workflow',
      description: data.description,
      nodes: data.nodes,
      edges: data.edges,
      isPreset: false,
    })
  }

  private rowToEntity(row: Record<string, unknown>): Workflow {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      nodes: JSON.parse(row.nodes as string) as unknown[],
      edges: JSON.parse(row.edges as string) as unknown[],
      thumbnailPath: row.thumbnail_path as string | undefined,
      isPreset: row.is_preset === 1,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}

let repo: WorkflowRepository | null = null

export function getWorkflowRepository(): WorkflowRepository {
  if (!repo) repo = new WorkflowRepository()
  return repo
}
