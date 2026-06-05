import { getDatabase } from '../database'
import { v4 as uuid } from 'uuid'
import { getCurrentUserId } from '../services/auth-service'
import type { AgentMessage, WorkflowPlan } from '../../../src/types/agent'

export interface AgentSession {
  id: string
  userId: string
  projectId?: string
  title?: string
  messages: AgentMessage[]
  lastPlan?: WorkflowPlan
  createdAt: string
  updatedAt: string
}

export class AgentSessionRepository {
  create(projectId?: string, title?: string): string {
    const db = getDatabase()
    const id = uuid()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO agent_sessions (id, user_id, project_id, title, messages, last_plan, created_at, updated_at)
      VALUES (?, ?, ?, ?, '[]', NULL, ?, ?)
    `).run(id, getCurrentUserId(), projectId ?? null, title ?? null, now, now)
    return id
  }

  findById(id: string): AgentSession | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.rowToEntity(row) : null
  }

  list(projectId?: string, limit = 20): AgentSession[] {
    const db = getDatabase()
    const userId = getCurrentUserId()
    const rows = projectId
      ? (db
          .prepare(
            `SELECT * FROM agent_sessions WHERE user_id = ? AND project_id = ? ORDER BY updated_at DESC LIMIT ?`,
          )
          .all(userId, projectId, limit) as Record<string, unknown>[])
      : (db
          .prepare(`SELECT * FROM agent_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`)
          .all(userId, limit) as Record<string, unknown>[])
    return rows.map((r) => this.rowToEntity(r))
  }

  appendMessage(id: string, message: AgentMessage, plan?: WorkflowPlan): void {
    const db = getDatabase()
    const session = this.findById(id)
    if (!session) return
    const messages = [...session.messages, message]
    db.prepare(`
      UPDATE agent_sessions SET messages = ?, last_plan = ?, updated_at = datetime('now') WHERE id = ?
    `).run(
      JSON.stringify(messages),
      plan ? JSON.stringify(plan) : session.lastPlan ? JSON.stringify(session.lastPlan) : null,
      id,
    )
  }

  private rowToEntity(row: Record<string, unknown>): AgentSession {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      projectId: (row.project_id as string) || undefined,
      title: (row.title as string) || undefined,
      messages: JSON.parse((row.messages as string) || '[]') as AgentMessage[],
      lastPlan: row.last_plan ? (JSON.parse(row.last_plan as string) as WorkflowPlan) : undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}

export const agentSessionRepository = new AgentSessionRepository()
