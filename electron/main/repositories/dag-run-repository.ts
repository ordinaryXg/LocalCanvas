import { getDatabase } from '../database'
import { v4 as uuid } from 'uuid'
import { getCurrentUserId } from '../services/auth-service'

export type DagRunStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
export type DagNodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface DagRun {
  id: string
  userId: string
  projectId: string
  groupId?: string
  status: DagRunStatus
  totalNodes: number
  completedNodes: number
  currentNodeId?: string
  snapshot: string
  error?: string
  createdAt: string
  updatedAt: string
}

export interface DagRunNode {
  id: string
  dagRunId: string
  nodeId: string
  status: DagNodeStatus
  startedAt?: string
  completedAt?: string
  error?: string
  output?: string
}

export class DagRunRepository {
  create(projectId: string, snapshot: unknown, nodeIds: string[], groupId?: string): string {
    const db = getDatabase()
    const id = uuid()
    const now = new Date().toISOString()
    const userId = getCurrentUserId()

    db.prepare(`
      INSERT INTO dag_runs (id, user_id, project_id, group_id, status, total_nodes,
        completed_nodes, snapshot, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, 0, ?, ?, ?)
    `).run(id, userId, projectId, groupId ?? null, nodeIds.length, JSON.stringify(snapshot), now, now)

    const insertNode = db.prepare(`
      INSERT INTO dag_run_nodes (id, dag_run_id, node_id, status)
      VALUES (?, ?, ?, 'pending')
    `)
    db.transaction(() => {
      for (const nodeId of nodeIds) {
        insertNode.run(uuid(), id, nodeId)
      }
    })()

    return id
  }

  findById(id: string): DagRun | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM dag_runs WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.rowToRun(row) : null
  }

  findNodes(dagRunId: string): DagRunNode[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM dag_run_nodes WHERE dag_run_id = ? ORDER BY rowid ASC')
      .all(dagRunId) as Record<string, unknown>[]
    return rows.map((r) => ({
      id: r.id as string,
      dagRunId: r.dag_run_id as string,
      nodeId: r.node_id as string,
      status: r.status as DagNodeStatus,
      startedAt: (r.started_at as string) || undefined,
      completedAt: (r.completed_at as string) || undefined,
      error: (r.error as string) || undefined,
      output: (r.output as string) || undefined,
    }))
  }

  updateRun(id: string, updates: Partial<Pick<DagRun, 'status' | 'completedNodes' | 'currentNodeId' | 'error'>>): void {
    const db = getDatabase()
    const sets: string[] = []
    const values: unknown[] = []

    if (updates.status !== undefined) {
      sets.push('status = ?')
      values.push(updates.status)
    }
    if (updates.completedNodes !== undefined) {
      sets.push('completed_nodes = ?')
      values.push(updates.completedNodes)
    }
    if (updates.currentNodeId !== undefined) {
      sets.push('current_node_id = ?')
      values.push(updates.currentNodeId)
    }
    if (updates.error !== undefined) {
      sets.push('error = ?')
      values.push(updates.error)
    }
    if (sets.length === 0) return

    sets.push("updated_at = datetime('now')")
    values.push(id)
    db.prepare(`UPDATE dag_runs SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  }

  updateNode(dagRunId: string, nodeId: string, updates: Partial<Pick<DagRunNode, 'status' | 'error' | 'output'>>): void {
    const db = getDatabase()
    const sets: string[] = []
    const values: unknown[] = []

    if (updates.status !== undefined) {
      sets.push('status = ?')
      values.push(updates.status)
      if (updates.status === 'running') {
        sets.push("started_at = datetime('now')")
      }
      if (updates.status === 'completed' || updates.status === 'failed' || updates.status === 'skipped') {
        sets.push("completed_at = datetime('now')")
      }
    }
    if (updates.error !== undefined) {
      sets.push('error = ?')
      values.push(updates.error)
    }
    if (updates.output !== undefined) {
      sets.push('output = ?')
      values.push(updates.output)
    }
    if (sets.length === 0) return

    values.push(dagRunId, nodeId)
    db.prepare(`UPDATE dag_run_nodes SET ${sets.join(', ')} WHERE dag_run_id = ? AND node_id = ?`).run(...values)
  }

  recoverInterruptedRuns(): Array<{ id: string; projectId: string }> {
    const db = getDatabase()
    const rows = db
      .prepare("SELECT id, project_id FROM dag_runs WHERE status = 'running'")
      .all() as Array<{ id: string; project_id: string }>

    for (const row of rows) {
      db.prepare("UPDATE dag_runs SET status = 'paused', updated_at = datetime('now') WHERE id = ?").run(row.id)
    }
    return rows.map((r) => ({ id: r.id, projectId: r.project_id }))
  }

  private rowToRun(row: Record<string, unknown>): DagRun {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      projectId: row.project_id as string,
      groupId: (row.group_id as string) || undefined,
      status: row.status as DagRunStatus,
      totalNodes: row.total_nodes as number,
      completedNodes: row.completed_nodes as number,
      currentNodeId: (row.current_node_id as string) || undefined,
      snapshot: row.snapshot as string,
      error: (row.error as string) || undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}

export const dagRunRepository = new DagRunRepository()
